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
