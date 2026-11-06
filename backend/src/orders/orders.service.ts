import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { OrderItem, OrderItemStatus } from '../database/entities/order-item.entity';
import { RestaurantTable, TableStatus } from '../database/entities/table.entity';
import { FoodItem } from '../database/entities/food-item.entity';
import { EventsGateway } from '../events/events.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { InventoryService } from '../inventory/inventory.service';

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
    private readonly inventoryService: InventoryService,
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

  async findActiveByTable(tableId: string, subOrder?: string) {
    const where: any = { tableId, status: OrderStatus.ACTIVE };
    if (subOrder) where.subOrder = subOrder.toUpperCase();
    return this.orderRepo.findOne({
      where,
      relations: ['table', 'table.floor', 'waiter', 'items', 'items.foodItem', 'items.chef', 'items.deliveredBy'],
      order: { subOrder: 'ASC' },
    });
  }

  async findAllActiveByTable(tableId: string) {
    return this.orderRepo.find({
      where: { tableId, status: OrderStatus.ACTIVE },
      relations: ['table', 'table.floor', 'waiter', 'items', 'items.foodItem', 'items.chef', 'items.deliveredBy'],
      order: { subOrder: 'ASC' },
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
    itemsData: Array<{ foodItemId: string; quantity: number; specialInstructions?: string; portion?: string; unitPrice?: number }>,
    customerName?: string,
    notes?: string,
    user?: any,
    subOrder = 'A',
  ) {
    if (!itemsData || itemsData.length === 0) {
      throw new BadRequestException('An order must contain at least one item');
    }

    const table = await this.tableRepo.findOne({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Table not found');

    const targetSubOrder = (subOrder || 'A').toUpperCase();

    // Run transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check existing active order on table for this sub-order
      let order = await queryRunner.manager.findOne(Order, {
        where: { tableId, subOrder: targetSubOrder, status: OrderStatus.ACTIVE },
      });

      const baseNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderNumber = order ? order.orderNumber : `${baseNumber}-${targetSubOrder}`;

      if (!order) {
        order = queryRunner.manager.create(Order, {
          orderNumber,
          tableId,
          waiterId: user?.id,
          customerName,
          notes,
          status: OrderStatus.ACTIVE,
          subOrder: targetSubOrder,
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

      // Auto-deduct inventory ingredients
      this.inventoryService.deductIngredientsForOrderItems(itemsData, fullOrder.orderNumber);

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

  async requestBill(tableId: string, user: any, orderId?: string, subOrder?: string) {
    const table = await this.tableRepo.findOne({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Table not found');

    let activeOrder: Order | null = null;
    if (orderId) {
      activeOrder = await this.orderRepo.findOne({
        where: { id: orderId, tableId },
        relations: ['table', 'waiter', 'items'],
      });
    } else if (subOrder) {
      activeOrder = await this.findActiveByTable(tableId, subOrder);
    } else {
      activeOrder = await this.findActiveByTable(tableId);
    }
    if (!activeOrder) throw new BadRequestException('No active order on this table');

    table.status = TableStatus.BILLING;
    await this.tableRepo.save(table);

    const payload = {
      tableId: table.id,
      tableNumber: table.tableNumber,
      orderId: activeOrder.id,
      orderNumber: activeOrder.orderNumber,
      subOrder: activeOrder.subOrder || 'A',
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

  async cancelOrderItem(orderItemId: string, reason: string, user: any) {
    const item = await this.itemRepo.findOne({
      where: { id: orderItemId },
      relations: ['order', 'order.table', 'foodItem'],
    });
    if (!item) throw new NotFoundException('Order item not found');

    if (item.status === OrderItemStatus.CANCELLED) {
      throw new BadRequestException('Order item is already cancelled');
    }

    if (item.order?.status !== OrderStatus.ACTIVE) {
      throw new BadRequestException('Cannot cancel item on a non-active or settled order');
    }

    item.status = OrderItemStatus.CANCELLED;
    const cancelNote = reason ? `[CANCELLED: ${reason}]` : '[CANCELLED by customer]';
    item.specialInstructions = item.specialInstructions
      ? `${item.specialInstructions} ${cancelNote}`
      : cancelNote;

    const savedItem = await this.itemRepo.save(item);

    // Recalculate remaining active items for this order
    const allItems = await this.itemRepo.find({
      where: { orderId: item.orderId },
    });

    const nonCancelledItems = allItems.filter(
      (it) => it.status !== OrderItemStatus.CANCELLED,
    );

    const order = await this.orderRepo.findOne({
      where: { id: item.orderId },
      relations: ['table'],
    });

    if (order) {
      if (nonCancelledItems.length === 0) {
        // If all items were cancelled, cancel the entire order and free the table!
        order.subtotal = 0;
        order.taxAmount = 0;
        order.totalAmount = 0;
        order.status = OrderStatus.CANCELLED;
        await this.orderRepo.save(order);

        if (order.tableId) {
          await this.tableRepo.update(order.tableId, { status: TableStatus.AVAILABLE });
          const table = await this.tableRepo.findOne({ where: { id: order.tableId } });
          if (table) {
            this.eventsGateway.notifyTableStatus(table);
          }
        }
      } else {
        const subtotal = nonCancelledItems.reduce(
          (acc, it) => acc + Number(it.totalPrice),
          0,
        );
        const taxAmount = Number((subtotal * 0.05).toFixed(2));
        const totalAmount = Number((subtotal + taxAmount).toFixed(2));

        order.subtotal = subtotal;
        order.taxAmount = taxAmount;
        order.totalAmount = totalAmount;
        await this.orderRepo.save(order);
      }
    }

    // Broadcast item status update
    this.eventsGateway.notifyItemStatusUpdated(savedItem);

    if (order) {
      const fullOrder = await this.findOne(order.id);
      this.eventsGateway.notifyNewOrder(fullOrder);
    }

    await this.logService.log({
      userId: user?.id,
      username: user?.username,
      roleName: user?.role?.name,
      action: 'ITEM_CANCELLED',
      resource: 'orders',
      resourceId: item.orderId,
      details: {
        itemId: item.id,
        foodName: item.foodItem?.name,
        quantity: item.quantity,
        reason: reason || 'Customer requested cancellation',
        table: item.order?.table?.tableNumber,
      },
    });

    return {
      success: true,
      item: savedItem,
      message: `Item "${item.foodItem?.name || ''}" cancelled successfully`,
    };
  }

  // --- Table Shift (Transfer Table) ---
  async transferTable(orderId: string, newTableId: string, user: any) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, status: OrderStatus.ACTIVE },
      relations: ['table'],
    });
    if (!order) throw new NotFoundException('Active order not found');

    const oldTable = await this.tableRepo.findOne({ where: { id: order.tableId } });
    const newTable = await this.tableRepo.findOne({ where: { id: newTableId } });

    if (!newTable) throw new NotFoundException('Destination table not found');
    if (newTable.status === TableStatus.OCCUPIED) {
      throw new BadRequestException(`Destination table ${newTable.tableNumber} is already occupied!`);
    }

    // Move order to new table
    order.tableId = newTableId;
    await this.orderRepo.save(order);

    // Free old table
    if (oldTable) {
      oldTable.status = TableStatus.AVAILABLE;
      await this.tableRepo.save(oldTable);
      this.eventsGateway.notifyTableStatus(oldTable);
    }

    // Occupy new table
    newTable.status = TableStatus.OCCUPIED;
    await this.tableRepo.save(newTable);
    this.eventsGateway.notifyTableStatus(newTable);

    const updatedOrder = await this.findOne(order.id);
    this.eventsGateway.notifyNewOrder(updatedOrder);

    await this.logService.log({
      userId: user?.id,
      username: user?.username,
      roleName: user?.role?.name,
      action: 'TABLE_TRANSFERRED',
      resource: 'orders',
      resourceId: order.id,
      details: {
        orderNumber: order.orderNumber,
        fromTable: oldTable?.tableNumber,
        toTable: newTable.tableNumber,
      },
    });

    return {
      success: true,
      message: `Order shifted from Table ${oldTable?.tableNumber} to Table ${newTable.tableNumber}`,
      order: updatedOrder,
    };
  }

  // --- Table Merge ---
  async mergeTable(targetOrderId: string, sourceTableId: string, user: any) {
    const targetOrder = await this.orderRepo.findOne({
      where: { id: targetOrderId, status: OrderStatus.ACTIVE },
      relations: ['table'],
    });
    if (!targetOrder) throw new NotFoundException('Target active order not found');

    const sourceOrder = await this.orderRepo.findOne({
      where: { tableId: sourceTableId, status: OrderStatus.ACTIVE },
      relations: ['table', 'items'],
    });
    if (!sourceOrder) throw new NotFoundException('No active order on source table to merge');

    const sourceTable = await this.tableRepo.findOne({ where: { id: sourceTableId } });

    // Move all items from source order to target order
    for (const it of sourceOrder.items) {
      it.orderId = targetOrder.id;
      await this.itemRepo.save(it);
    }

    // Recalculate target order totals
    const allItems = await this.itemRepo.find({
      where: { orderId: targetOrder.id },
    });
    const subtotal = allItems.reduce((acc, it) => acc + Number(it.totalPrice), 0);
    const taxAmount = Number((subtotal * 0.05).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    targetOrder.subtotal = subtotal;
    targetOrder.taxAmount = taxAmount;
    targetOrder.totalAmount = totalAmount;
    await this.orderRepo.save(targetOrder);

    // Close source order and release source table
    sourceOrder.status = OrderStatus.COMPLETED;
    sourceOrder.notes = `Merged into ${targetOrder.orderNumber}`;
    await this.orderRepo.save(sourceOrder);

    if (sourceTable) {
      sourceTable.status = TableStatus.AVAILABLE;
      await this.tableRepo.save(sourceTable);
      this.eventsGateway.notifyTableStatus(sourceTable);
    }

    const updatedTarget = await this.findOne(targetOrder.id);
    this.eventsGateway.notifyNewOrder(updatedTarget);

    await this.logService.log({
      userId: user?.id,
      username: user?.username,
      roleName: user?.role?.name,
      action: 'TABLE_MERGED',
      resource: 'orders',
      resourceId: targetOrder.id,
      details: {
        targetOrder: targetOrder.orderNumber,
        sourceTable: sourceTable?.tableNumber,
        targetTable: targetOrder.table?.tableNumber,
      },
    });

    return {
      success: true,
      message: `Table ${sourceTable?.tableNumber} merged into Table ${targetOrder.table?.tableNumber}`,
      order: updatedTarget,
    };
  }
}
