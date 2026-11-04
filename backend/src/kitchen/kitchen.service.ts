import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { OrderItem, OrderItemStatus } from '../database/entities/order-item.entity';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { User } from '../database/entities/user.entity';
import { EventsGateway } from '../events/events.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class KitchenService {
  constructor(
    @InjectRepository(OrderItem)
    private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventsGateway: EventsGateway,
    private readonly logService: ActivityLogsService,
  ) {}

  getDateBounds(range = 'today'): { startDate: Date; endDate: Date; rangeLabel: string } {
    const now = new Date();
    const r = (range || 'today').toLowerCase().trim();

    if (r === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStart = new Date(Date.UTC(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0));
      const yEnd = new Date(Date.UTC(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999));
      return { startDate: yStart, endDate: yEnd, rangeLabel: 'Yesterday' };
    }

    if (r === 'week' || r === 'this_week' || r === 'this week') {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const mon = new Date(now);
      mon.setDate(mon.getDate() + diff);
      const wStart = new Date(Date.UTC(mon.getFullYear(), mon.getMonth(), mon.getDate(), 0, 0, 0, 0));
      const wEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
      return { startDate: wStart, endDate: wEnd, rangeLabel: 'This Week' };
    }

    if (r === 'month' || r === 'this_month' || r === 'this month') {
      const mStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
      const mEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
      return { startDate: mStart, endDate: mEnd, rangeLabel: 'This Month' };
    }

    if (r === 'overall' || r === 'all' || r === 'all_time') {
      const oStart = new Date(Date.UTC(2020, 0, 1, 0, 0, 0, 0));
      const oEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
      return { startDate: oStart, endDate: oEnd, rangeLabel: 'Overall' };
    }

    // Default: 'today'
    const tStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const tEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
    return { startDate: tStart, endDate: tEnd, rangeLabel: 'Today' };
  }

  async getKitchenPreparationHistory(options: {
    chefId?: string;
    range?: string;
    search?: string;
    dietary?: string;
  }) {
    const { startDate, endDate, rangeLabel } = this.getDateBounds(options.range);

    const qb = this.itemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.foodItem', 'foodItem')
      .leftJoinAndSelect('foodItem.category', 'category')
      .leftJoinAndSelect('item.order', 'order')
      .leftJoinAndSelect('order.table', 'table')
      .leftJoinAndSelect('table.floor', 'floor')
      .leftJoinAndSelect('order.waiter', 'waiter')
      .leftJoinAndSelect('item.chef', 'chef')
      .where('item.status IN (:...statuses)', {
        statuses: [OrderItemStatus.READY, OrderItemStatus.DELIVERED],
      })
      .andWhere(
        '((item.readyAt >= :startDate AND item.readyAt <= :endDate) OR (item.readyAt IS NULL AND item.updatedAt >= :startDate AND item.updatedAt <= :endDate))',
        { startDate, endDate },
      );

    if (options.chefId) {
      qb.andWhere('item.chefId = :chefId', { chefId: options.chefId });
    }

    if (options.dietary === 'VEG') {
      qb.andWhere('foodItem.isVeg = true');
    } else if (options.dietary === 'NON_VEG') {
      qb.andWhere('foodItem.isVeg = false');
    }

    if (options.search?.trim()) {
      const s = `%${options.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(foodItem.name) LIKE :s OR LOWER(order.orderNumber) LIKE :s OR LOWER(table.tableNumber) LIKE :s OR LOWER(chef.name) LIKE :s)',
        { s },
      );
    }

    qb.orderBy('item.readyAt', 'DESC').addOrderBy('item.updatedAt', 'DESC');

    const historyItems = await qb.getMany();

    // Calculate detailed aggregates
    let totalDishes = 0;
    let vegCount = 0;
    let nonVegCount = 0;
    let totalPrepMinutes = 0;
    let prepCountWithTime = 0;
    const dishFrequency: Record<string, { name: string; isVeg: boolean; count: number; category: string }> = {};

    const formatted = historyItems.map((item) => {
      const qty = item.quantity || 1;
      totalDishes += qty;
      if (item.foodItem?.isVeg) {
        vegCount += qty;
      } else {
        nonVegCount += qty;
      }

      // Preparation duration in minutes
      let prepMinutes = 0;
      if (item.startedAt && item.readyAt) {
        const diffMs = new Date(item.readyAt).getTime() - new Date(item.startedAt).getTime();
        prepMinutes = Math.max(1, Math.round(diffMs / 60000));
        totalPrepMinutes += prepMinutes;
        prepCountWithTime++;
      } else if (item.acceptedAt && item.readyAt) {
        const diffMs = new Date(item.readyAt).getTime() - new Date(item.acceptedAt).getTime();
        prepMinutes = Math.max(1, Math.round(diffMs / 60000));
        totalPrepMinutes += prepMinutes;
        prepCountWithTime++;
      }

      const dishName = item.foodItem?.name || 'Unknown Item';
      if (!dishFrequency[dishName]) {
        dishFrequency[dishName] = {
          name: dishName,
          isVeg: !!item.foodItem?.isVeg,
          count: 0,
          category: item.foodItem?.category?.name || 'General',
        };
      }
      dishFrequency[dishName].count += qty;

      return {
        id: item.id,
        orderId: item.orderId,
        orderNumber: item.order?.orderNumber || 'N/A',
        tableNumber: item.order?.table?.tableNumber || 'N/A',
        floorName: item.order?.table?.floor?.name || 'Main Hall',
        foodItemId: item.foodItemId,
        dishName,
        categoryName: item.foodItem?.category?.name || 'Main Course',
        isVeg: item.foodItem?.isVeg ?? true,
        price: item.unitPrice,
        totalPrice: item.totalPrice,
        quantity: qty,
        status: item.status,
        specialInstructions: item.specialInstructions,
        chefId: item.chefId,
        chefName: item.chef?.name || item.chef?.username || 'Executive Chef',
        waiterName: item.order?.waiter?.name || item.order?.waiter?.username || 'Staff',
        orderPlacedAt: item.createdAt,
        acceptedAt: item.acceptedAt,
        startedAt: item.startedAt,
        readyAt: item.readyAt,
        deliveredAt: item.deliveredAt,
        prepMinutes,
      };
    });

    const topDishes = Object.values(dishFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const avgPrepMinutes = prepCountWithTime > 0 ? Math.round(totalPrepMinutes / prepCountWithTime) : 12;

    return {
      range: options.range || 'today',
      rangeLabel,
      totalOrdersHandled: new Set(historyItems.map((i) => i.orderId)).size,
      totalDishesPrepared: totalDishes,
      totalBatches: historyItems.length,
      vegCount,
      nonVegCount,
      avgPrepMinutes,
      topDishes,
      items: formatted,
    };
  }

  async getActiveKitchenTasks() {
    return this.itemRepo.find({
      where: {
        status: In([OrderItemStatus.PENDING, OrderItemStatus.ACCEPTED, OrderItemStatus.PREPARING, OrderItemStatus.READY]),
        order: {
          status: OrderStatus.ACTIVE,
        },
      },
      relations: ['order', 'order.table', 'order.table.floor', 'order.waiter', 'foodItem', 'foodItem.category', 'chef'],
      order: { createdAt: 'ASC' },
    });
  }

  async getKitchenChefs() {
    return this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('(LOWER(role.name) = :chefRole OR LOWER(role.displayName) LIKE :chefLike OR LOWER(user.name) LIKE :chefNameLike)', {
        chefRole: 'chef',
        chefLike: '%chef%',
        chefNameLike: '%chef%',
      })
      .orderBy('user.name', 'ASC')
      .getMany();
  }

  async acceptItem(itemId: string, user: any, requestedChefId?: string) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['order', 'order.table', 'foodItem'],
    });
    if (!item) throw new NotFoundException('Item not found');

    let assignedChefId = user.id;
    let assignedChefName = user.name || user.username;

    // If a specific chef was selected (e.g., admin operating KDS on behalf of a chef)
    if (requestedChefId) {
      const chef = await this.userRepo.findOne({ where: { id: requestedChefId } });
      if (chef) {
        assignedChefId = chef.id;
        assignedChefName = chef.name || chef.username;
      }
    }

    item.status = OrderItemStatus.ACCEPTED;
    item.chefId = assignedChefId;
    item.acceptedAt = new Date();
    await this.itemRepo.save(item);

    const fullItem = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['order', 'order.table', 'order.table.floor', 'order.waiter', 'foodItem', 'foodItem.category', 'chef'],
    });

    this.eventsGateway.notifyItemStatusUpdated(fullItem || item);

    await this.logService.log({
      userId: user.id,
      username: user.username,
      roleName: user.role?.name,
      action: 'KITCHEN_ACCEPT',
      resource: 'orders',
      resourceId: item.orderId,
      details: {
        itemId: item.id,
        item: item.foodItem?.name,
        assignedChefId,
        assignedChefName,
        initiatedBy: user.username,
      },
    });

    return fullItem || item;
  }

  async startPreparing(itemId: string, user: any, requestedChefId?: string) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['order', 'order.table', 'foodItem'],
    });
    if (!item) throw new NotFoundException('Item not found');

    let assignedChefId = item.chefId || user.id;
    let assignedChefName = user.name || user.username;

    if (requestedChefId) {
      const chef = await this.userRepo.findOne({ where: { id: requestedChefId } });
      if (chef) {
        assignedChefId = chef.id;
        assignedChefName = chef.name || chef.username;
      }
    }

    item.status = OrderItemStatus.PREPARING;
    item.chefId = assignedChefId;
    if (!item.startedAt) item.startedAt = new Date();
    await this.itemRepo.save(item);

    const fullItem = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['order', 'order.table', 'order.table.floor', 'order.waiter', 'foodItem', 'foodItem.category', 'chef'],
    });

    this.eventsGateway.notifyItemStatusUpdated(fullItem || item);

    await this.logService.log({
      userId: user.id,
      username: user.username,
      roleName: user.role?.name,
      action: 'KITCHEN_START_PREP',
      resource: 'orders',
      resourceId: item.orderId,
      details: {
        itemId: item.id,
        item: item.foodItem?.name,
        assignedChefId,
        assignedChefName,
        initiatedBy: user.username,
      },
    });

    return fullItem || item;
  }

  async markItemReady(itemId: string, user: any, requestedChefId?: string) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['order', 'order.table', 'foodItem'],
    });
    if (!item) throw new NotFoundException('Item not found');

    let assignedChefId = item.chefId || user.id;
    let assignedChefName = user.name || user.username;

    if (requestedChefId) {
      const chef = await this.userRepo.findOne({ where: { id: requestedChefId } });
      if (chef) {
        assignedChefId = chef.id;
        assignedChefName = chef.name || chef.username;
      }
    }

    item.status = OrderItemStatus.READY;
    item.chefId = assignedChefId;
    item.readyAt = new Date();
    await this.itemRepo.save(item);

    const fullItem = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['order', 'order.table', 'order.table.floor', 'order.waiter', 'foodItem', 'foodItem.category', 'chef'],
    });

    // Notify service staff that this specific table's item is ready to serve
    this.eventsGateway.notifyItemStatusUpdated(fullItem || item);

    await this.logService.log({
      userId: user.id,
      username: user.username,
      roleName: user.role?.name,
      action: 'KITCHEN_ITEM_READY',
      resource: 'orders',
      resourceId: item.orderId,
      details: {
        itemId: item.id,
        item: item.foodItem?.name,
        table: item.order?.table?.tableNumber,
        assignedChefId,
        assignedChefName,
        initiatedBy: user.username,
      },
    });

    return fullItem || item;
  }

  async assignChef(itemId: string, chefId: string, user: any) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['order', 'foodItem'],
    });
    if (!item) throw new NotFoundException('Item not found');

    const chef = await this.userRepo.findOne({ where: { id: chefId } });
    if (!chef) throw new NotFoundException('Chef not found');

    item.chefId = chef.id;
    await this.itemRepo.save(item);

    const fullItem = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['order', 'order.table', 'order.table.floor', 'order.waiter', 'foodItem', 'foodItem.category', 'chef'],
    });

    this.eventsGateway.notifyItemStatusUpdated(fullItem || item);

    await this.logService.log({
      userId: user.id,
      username: user.username,
      roleName: user.role?.name,
      action: 'KITCHEN_ASSIGN_CHEF',
      resource: 'orders',
      resourceId: item.orderId,
      details: {
        itemId: item.id,
        item: item.foodItem?.name,
        assignedChefId: chef.id,
        assignedChefName: chef.name || chef.username,
        reassignedBy: user.username,
      },
    });

    return fullItem || item;
  }
}
