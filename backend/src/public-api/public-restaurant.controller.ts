import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { TenantRestaurant } from '../database/entities/tenant-restaurant.entity';
import { RestaurantTable, TableStatus } from '../database/entities/table.entity';
import { FoodCategory } from '../database/entities/food-category.entity';
import { FoodItem } from '../database/entities/food-item.entity';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { OrderItem, OrderItemStatus } from '../database/entities/order-item.entity';
import { TableReservation } from '../database/entities/table-reservation.entity';
import { EventsGateway } from '../events/events.gateway';

@ApiTags('public-restaurant')
@Controller('public/restaurant')
export class PublicRestaurantController {
  constructor(
    @InjectRepository(TenantRestaurant)
    private readonly tenantRepo: Repository<TenantRestaurant>,
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(FoodCategory)
    private readonly catRepo: Repository<FoodCategory>,
    @InjectRepository(FoodItem)
    private readonly foodRepo: Repository<FoodItem>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(TableReservation)
    private readonly resRepo: Repository<TableReservation>,
    private readonly eventsGateway: EventsGateway,
    private readonly dataSource: DataSource,
  ) {}

  // 1. Get QR Menu for Diners at a Specific Table
  @Get(':slug/qr-menu/:tableNumber')
  @ApiOperation({ summary: 'Customer scans QR on table: loads menu with photos and portions' })
  async getQrMenu(
    @Param('slug') slug: string,
    @Param('tableNumber') tableNumber: string,
  ) {
    const restaurant = await this.tenantRepo.findOne({ where: { slug } });
    if (!restaurant) throw new NotFoundException(`Restaurant "${slug}" not found`);

    const table = await this.tableRepo.findOne({
      where: {
        restaurantId: restaurant.id,
        tableNumber: tableNumber.toUpperCase(),
      },
    });

    if (!table) {
      throw new NotFoundException(`Table "${tableNumber}" not found for this restaurant`);
    }

    const categories = await this.catRepo.find({
      where: { restaurantId: restaurant.id, isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });

    const items = await this.foodRepo.find({
      where: { restaurantId: restaurant.id, isActive: true },
      relations: ['availability'],
      order: { name: 'ASC' },
    });

    return {
      restaurant: {
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
        brandLogo: restaurant.brandLogo,
        cuisine: restaurant.cuisine,
        address: restaurant.address,
        city: restaurant.city,
        contactPhone: restaurant.contactPhone,
      },
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        seatingCapacity: table.seatingCapacity,
        status: table.status,
      },
      categories,
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        categoryId: i.categoryId,
        description: i.description,
        price: Number(i.price),
        portions: i.portions || [
          { name: 'Full', price: Number(i.price) },
          { name: 'Half (1/2)', price: Math.round(Number(i.price) * 0.62) },
        ],
        imageUrl: i.imageUrl,
        isVeg: i.isVeg,
        isAvailable: i.availability?.isAvailable ?? true,
      })),
    };
  }

  // 2. Customer Submits Dine-In Self-Order from Mobile
  @Post(':slug/qr-order')
  @ApiOperation({ summary: 'Diner places order from mobile phone; sends KOT to kitchen' })
  async placeQrOrder(
    @Param('slug') slug: string,
    @Body()
    body: {
      tableNumber: string;
      customerName: string;
      customerPhone?: string;
      notes?: string;
      subOrder?: string;
      items: Array<{
        foodItemId: string;
        quantity: number;
        portion?: string;
        unitPrice?: number;
        specialInstructions?: string;
      }>;
    },
  ) {
    const restaurant = await this.tenantRepo.findOne({ where: { slug } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const table = await this.tableRepo.findOne({
      where: {
        restaurantId: restaurant.id,
        tableNumber: body.tableNumber.toUpperCase(),
      },
    });
    if (!table) throw new NotFoundException(`Table ${body.tableNumber} not found`);

    if (!body.items || body.items.length === 0) {
      throw new BadRequestException('At least one dish must be selected');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const targetSubOrder = (body.subOrder || 'A').toUpperCase();

      // Find existing active order or create new
      let order = await queryRunner.manager.findOne(Order, {
        where: {
          tableId: table.id,
          status: OrderStatus.ACTIVE,
          subOrder: targetSubOrder,
        },
      });

      if (!order) {
        const orderNumber = `QR-${Date.now().toString().slice(-6)}`;
        order = queryRunner.manager.create(Order, {
          orderNumber,
          restaurantId: restaurant.id,
          tableId: table.id,
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          isQrSelfOrder: true,
          notes: body.notes || 'Dine-In Customer QR Self-Order',
          status: OrderStatus.ACTIVE,
          subOrder: targetSubOrder,
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
        });
        order = await queryRunner.manager.save(order);
      }

      let additionalSubtotal = 0;
      const createdItems: OrderItem[] = [];

      for (const itemInput of body.items) {
        const food = await queryRunner.manager.findOne(FoodItem, {
          where: { id: itemInput.foodItemId },
          relations: ['availability'],
        });
        if (!food || !food.isActive) {
          throw new BadRequestException(`Dish ${itemInput.foodItemId} not available`);
        }

        let unitPrice = Number(food.price);
        if (itemInput.portion && Array.isArray(food.portions)) {
          const matched = food.portions.find(
            (p) => p.name.toLowerCase() === itemInput.portion?.toLowerCase(),
          );
          if (matched && matched.price) {
            unitPrice = Number(matched.price);
          }
        }
        if (itemInput.unitPrice && Number(itemInput.unitPrice) > 0) {
          unitPrice = Number(itemInput.unitPrice);
        }

        const totalPrice = unitPrice * itemInput.quantity;
        additionalSubtotal += totalPrice;

        const orderItem = queryRunner.manager.create(OrderItem, {
          orderId: order.id,
          foodItemId: food.id,
          quantity: itemInput.quantity,
          unitPrice,
          totalPrice,
          status: OrderItemStatus.PENDING,
          portion: itemInput.portion || 'Full',
          specialInstructions: itemInput.specialInstructions,
        });
        const saved = await queryRunner.manager.save(orderItem);
        createdItems.push(saved);
      }

      const newSubtotal = Number(order.subtotal) + additionalSubtotal;
      const newTax = Number((newSubtotal * 0.05).toFixed(2));
      const newTotal = Number((newSubtotal + newTax).toFixed(2));

      await queryRunner.manager.update(Order, order.id, {
        subtotal: newSubtotal,
        taxAmount: newTax,
        totalAmount: newTotal,
      });

      // Update table to occupied
      table.status = TableStatus.OCCUPIED;
      await queryRunner.manager.update(RestaurantTable, table.id, { status: TableStatus.OCCUPIED });

      await queryRunner.commitTransaction();

      const fullOrder = await this.orderRepo.findOne({
        where: { id: order.id },
        relations: ['items', 'items.foodItem', 'table'],
      });

      // Realtime alerts to Kitchen KDS and Floor Waiters
      if (fullOrder) {
        this.eventsGateway.notifyNewOrder(fullOrder);
        this.eventsGateway.notifyTableStatus(table);
      }

      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableNumber: table.tableNumber,
        subOrder: targetSubOrder,
        totalAmount: newTotal,
        message: `Order placed successfully! Chef is preparing your dishes for Table ${table.tableNumber}.`,
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  // 3. Table Reservations Engine
  @Post(':slug/reservations')
  @ApiOperation({ summary: 'Pre-book a dining table' })
  async bookTable(
    @Param('slug') slug: string,
    @Body()
    body: {
      customerName: string;
      customerPhone: string;
      guestCount: number;
      reservationDate: string;
      reservationTime: string;
      tableId?: string;
      advancePaid?: number;
      specialRequests?: string;
    },
  ) {
    const restaurant = await this.tenantRepo.findOne({ where: { slug } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    let tableId = body.tableId;
    if (!tableId) {
      // Auto-assign suitable available table
      const availableTable = await this.tableRepo.findOne({
        where: {
          restaurantId: restaurant.id,
          status: TableStatus.AVAILABLE,
          isActive: true,
        },
      });
      if (!availableTable) {
        throw new BadRequestException('No available tables matching party size');
      }
      tableId = availableTable.id;
    }

    const reservation = this.resRepo.create({
      restaurantId: restaurant.id,
      tableId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      guestCount: body.guestCount || 2,
      reservationDate: body.reservationDate || new Date().toISOString().split('T')[0],
      reservationTime: body.reservationTime || '19:30',
      advancePaid: body.advancePaid || 0,
      specialRequests: body.specialRequests,
      status: 'CONFIRMED',
    });

    const saved = await this.resRepo.save(reservation);

    // Update table status to RESERVED
    await this.tableRepo.update(tableId, { status: TableStatus.RESERVED });

    return {
      success: true,
      reservationId: saved.id,
      customerName: saved.customerName,
      date: saved.reservationDate,
      time: saved.reservationTime,
      tableId: saved.tableId,
      message: `Table reserved successfully for ${saved.customerName} on ${saved.reservationDate} at ${saved.reservationTime}!`,
    };
  }

  @Get(':slug/reservations')
  @ApiOperation({ summary: 'Get all reservations for restaurant' })
  async getReservations(@Param('slug') slug: string) {
    const restaurant = await this.tenantRepo.findOne({ where: { slug } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    return this.resRepo.find({
      where: { restaurantId: restaurant.id },
      relations: ['table'],
      order: { reservationDate: 'ASC', reservationTime: 'ASC' },
    });
  }

  @Patch('reservations/:id/status')
  @ApiOperation({ summary: 'Update reservation status (SEATED, CANCELLED, COMPLETED)' })
  async updateReservationStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const res = await this.resRepo.findOne({ where: { id } });
    if (!res) throw new NotFoundException('Reservation not found');
    res.status = status;
    if (status === 'SEATED') {
      await this.tableRepo.update(res.tableId, { status: TableStatus.OCCUPIED });
    } else if (status === 'CANCELLED' || status === 'COMPLETED') {
      await this.tableRepo.update(res.tableId, { status: TableStatus.AVAILABLE });
    }
    return this.resRepo.save(res);
  }
}
