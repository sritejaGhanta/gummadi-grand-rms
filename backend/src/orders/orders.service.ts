import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { OrderItem, OrderItemStatus } from '../database/entities/order-item.entity';
import { RestaurantTable, TableStatus } from '../database/entities/table.entity';
import { FoodItem } from '../database/entities/food-item.entity';
import { EventsGateway } from '../events/events.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(FoodItem)
    private readonly foodItemRepo: Repository<FoodItem>,
    private readonly dataSource: DataSource,
    private readonly eventsGateway: EventsGateway,
    private readonly logService: ActivityLogsService,
  ) {}

  async findAll(status?: OrderStatus) {
    const where: any = {};
    if (status) where.status = status;
    return this.orderRepo.find({
      where,
      relations: ['table', 'table.floor', 'waiter', 'items', 'items.foodItem', 'items.chef', 'items.deliveredBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveByTable(tableId: string) {
    return this.orderRepo.findOne({
      where: { tableId, status: OrderStatus.ACTIVE },
      relations: ['table', 'table.floor', 'waiter', 'items', 'items.foodItem', 'items.chef', 'items.deliveredBy'],
    });
  }

  async findOne(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['table', 'table.floor', 'waiter', 'items', 'items.foodItem', 'items.chef', 'items.deliveredBy'],
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async createOrder(
    tableId: string,
    itemsData: Array<{ foodItemId: string; quantity: number; specialInstructions?: string }>,
    customerName?: string,
    notes?: string,
    user?: any,
  ) {
    if (!itemsData || itemsData.length === 0) {
      throw new BadRequestException('An order must contain at least one item');
    }

    const table = await this.tableRepo.findOne({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Table not found');

    // Run transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check existing active order on table
      let order = await queryRunner.manager.findOne(Order, {
        where: { tableId, status: OrderStatus.ACTIVE },
      });

      const orderNumber = order
        ? order.orderNumber
        : `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (!order) {
        order = queryRunner.manager.create(Order, {
          orderNumber,
          tableId,
          waiterId: user?.id,
          customerName,
          notes,
          status: OrderStatus.ACTIVE,
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
        });
        order = await queryRunner.manager.save(order);
      }

      // Validate items & calculate totals
      let additionalSubtotal = 0;
      const createdItems: OrderItem[] = [];

      for (const itemInput of itemsData) {
        const food = await this.foodItemRepo.findOne({
          where: { id: itemInput.foodItemId },
          relations: ['availability'],
        });

        if (!food || !food.isActive) {
          throw new BadRequestException(`Food item "${itemInput.foodItemId}" not found or inactive`);
        }

        // Business Rule 1: A staff member cannot order a food item marked Sold Out.
        if (food.availability && !food.availability.isAvailable) {
          throw new BadRequestException(`Food item "${food.name}" is currently Sold Out!`);
        }

        const unitPrice = Number(food.price);
        const totalPrice = unitPrice * itemInput.quantity;
        additionalSubtotal += totalPrice;

        const orderItem = queryRunner.manager.create(OrderItem, {
          orderId: order.id,
          foodItemId: food.id,
          quantity: itemInput.quantity,
          unitPrice,
          totalPrice,
          status: OrderItemStatus.PENDING,
          specialInstructions: itemInput.specialInstructions,
        });

        const savedItem = await queryRunner.manager.save(orderItem);
        createdItems.push(savedItem);
      }

      // Update Order totals (5% tax default)
      const newSubtotal = Number(order.subtotal) + additionalSubtotal;
      const newTax = Number((newSubtotal * 0.05).toFixed(2));
      const newTotal = Number((newSubtotal + newTax).toFixed(2));
      await queryRunner.manager.update(Order, order.id, {
        subtotal: newSubtotal,
        taxAmount: newTax,
        totalAmount: newTotal,
      });

      // Update Table to OCCUPIED
      table.status = TableStatus.OCCUPIED;
      await queryRunner.manager.update(RestaurantTable, table.id, { status: TableStatus.OCCUPIED });

      await queryRunner.commitTransaction();

      const fullOrder = await this.findOne(order.id);

      // Real-time broadcasts
      this.eventsGateway.notifyNewOrder(fullOrder);
      this.eventsGateway.notifyTableStatus(table);

      // Activity log
      await this.logService.log({
        userId: user?.id,
        username: user?.username,
        roleName: user?.role?.name,
        action: 'ORDER_CREATED',
        resource: 'orders',
        resourceId: fullOrder.id,
        details: { orderNumber: fullOrder.orderNumber, table: table.tableNumber, itemsCount: itemsData.length },
      });

      return fullOrder;
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async markItemDelivered(orderItemId: string, user: any) {
    const item = await this.itemRepo.findOne({
      where: { id: orderItemId },
      relations: ['order', 'foodItem'],
    });
    if (!item) throw new NotFoundException('Order item not found');

    item.status = OrderItemStatus.DELIVERED;
    item.deliveredById = user.id;
    item.deliveredAt = new Date();
    const saved = await this.itemRepo.save(item);

    this.eventsGateway.notifyItemStatusUpdated(saved);

    await this.logService.log({
      userId: user.id,
      username: user.username,
      roleName: user.role?.name,
      action: 'ITEM_DELIVERED',
      resource: 'orders',
      resourceId: item.orderId,
      details: { itemId: item.id, foodName: item.foodItem?.name },
    });

    return saved;
  }

  async requestBill(tableId: string, user: any) {
    const table = await this.tableRepo.findOne({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Table not found');

    const activeOrder = await this.findActiveByTable(tableId);
    if (!activeOrder) throw new BadRequestException('No active order on this table');

    // Prevent duplicate bill request notifications if table is already in BILLING status
    if (table.status === TableStatus.BILLING) {
      return {
        tableId: table.id,
        tableNumber: table.tableNumber,
        orderId: activeOrder.id,
        orderNumber: activeOrder.orderNumber,
        requestedBy: user.username,
        alreadyRequested: true,
      };
    }

    table.status = TableStatus.BILLING;
    await this.tableRepo.save(table);

    const payload = {
      tableId: table.id,
      tableNumber: table.tableNumber,
      orderId: activeOrder.id,
      orderNumber: activeOrder.orderNumber,
      requestedBy: user.username,
      requestedAt: new Date(),
    };

    this.eventsGateway.notifyBillRequested(payload);
    this.eventsGateway.notifyTableStatus(table);

    await this.logService.log({
      userId: user.id,
      username: user.username,
      roleName: user.role?.name,
      action: 'BILL_REQUESTED',
      resource: 'tables',
      resourceId: tableId,
      details: payload,
    });

    return payload;
  }
}
