import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodCategory } from '../database/entities/food-category.entity';
import { FoodItem } from '../database/entities/food-item.entity';
import { FoodAvailability } from '../database/entities/food-availability.entity';
import { EventsGateway } from '../events/events.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(FoodCategory)
    private readonly categoryRepo: Repository<FoodCategory>,
    @InjectRepository(FoodItem)
    private readonly itemRepo: Repository<FoodItem>,
    @InjectRepository(FoodAvailability)
    private readonly availRepo: Repository<FoodAvailability>,
    private readonly eventsGateway: EventsGateway,
    private readonly logService: ActivityLogsService,
  ) {}

  // Categories
  async findAllCategories() {
    return this.categoryRepo.find({
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async createCategory(data: { name: string; description?: string; displayOrder?: number }) {
    const existing = await this.categoryRepo.findOne({ where: { name: data.name } });
    if (existing) {
      throw new BadRequestException(`Category "${data.name}" already exists`);
    }
    const cat = this.categoryRepo.create({
      name: data.name,
      description: data.description,
      displayOrder: data.displayOrder || 0,
      isActive: true,
    });
    return this.categoryRepo.save(cat);
  }

  async updateCategory(id: string, data: { name?: string; description?: string; displayOrder?: number; isActive?: boolean }) {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    if (data.name) cat.name = data.name;
    if (data.description !== undefined) cat.description = data.description;
    if (data.displayOrder !== undefined) cat.displayOrder = data.displayOrder;
    if (data.isActive !== undefined) cat.isActive = data.isActive;
    return this.categoryRepo.save(cat);
  }

  async deleteCategory(id: string) {
    const itemCount = await this.itemRepo.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      throw new BadRequestException('Cannot delete category with associated food items');
    }
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.categoryRepo.remove(cat);
  }

  // Food Items
  async findAllItems(categoryId?: string, activeOnly = false) {
    const qb = this.itemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.availability', 'availability')
      .orderBy('category.displayOrder', 'ASC')
      .addOrderBy('item.name', 'ASC');

    if (categoryId) {
      qb.andWhere('item.categoryId = :categoryId', { categoryId });
    }
    if (activeOnly) {
      qb.andWhere('item.isActive = true');
    }

    return qb.getMany();
  }

  async findItemById(id: string) {
    const item = await this.itemRepo.findOne({
      where: { id },
      relations: ['category', 'availability'],
    });
    if (!item) throw new NotFoundException(`Food item ${id} not found`);
    return item;
  }

  async createItem(data: {
    categoryId: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isVeg?: boolean;
    preparationTimeMinutes?: number;
  }) {
    if (!data?.name || !data.name.trim() || !data?.categoryId || data?.price === undefined || data?.price === null) {
      throw new BadRequestException('Category ID, Name, and Price are required');
    }
    if (data.price < 0) {
      throw new BadRequestException('Price must be greater than or equal to 0');
    }
    const cat = await this.categoryRepo.findOne({ where: { id: data.categoryId } });
    if (!cat) {
      throw new NotFoundException(`Category ${data.categoryId} not found`);
    }

    const item = this.itemRepo.create({
      categoryId: data.categoryId,
      name: data.name.trim(),
      description: data.description,
      price: data.price,
      imageUrl: data.imageUrl,
      isVeg: data.isVeg !== undefined ? data.isVeg : true,
      preparationTimeMinutes: data.preparationTimeMinutes || 15,
      isActive: true,
    });
    const saved = await this.itemRepo.save(item);

    // Create availability record
    const avail = this.availRepo.create({
      foodItemId: saved.id,
      isAvailable: true,
    });
    await this.availRepo.save(avail);

    return this.findItemById(saved.id);
  }

  async updateItem(
    id: string,
    data: {
      categoryId?: string;
      name?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
      isVeg?: boolean;
      preparationTimeMinutes?: number;
      isActive?: boolean;
    },
  ) {
    const item = await this.findItemById(id);
    if (data.categoryId) item.categoryId = data.categoryId;
    if (data.name) item.name = data.name;
    if (data.description !== undefined) item.description = data.description;
    if (data.price !== undefined) item.price = data.price;
    if (data.imageUrl !== undefined) item.imageUrl = data.imageUrl;
    if (data.isVeg !== undefined) item.isVeg = data.isVeg;
    if (data.preparationTimeMinutes !== undefined) item.preparationTimeMinutes = data.preparationTimeMinutes;
    if (data.isActive !== undefined) item.isActive = data.isActive;

    await this.itemRepo.save(item);
    return this.findItemById(id);
  }

  async setAvailability(foodItemId: string, isAvailable: boolean, user: any) {
    const item = await this.findItemById(foodItemId);
    let avail = await this.availRepo.findOne({ where: { foodItemId } });
    if (!avail) {
      avail = this.availRepo.create({ foodItemId });
    }
    avail.isAvailable = isAvailable;
    avail.updatedByUserId = user.id;
    avail.updatedByUsername = user.username;
    const saved = await this.availRepo.save(avail);

    // Real-time broadcast to all connected devices
    this.eventsGateway.notifyFoodAvailability({
      foodItemId,
      foodItemName: item.name,
      isAvailable,
      updatedBy: user.username,
      updatedAt: saved.updatedAt,
    });

    // Audit log
    await this.logService.log({
      userId: user.id,
      username: user.username,
      roleName: user.role?.name,
      action: isAvailable ? 'MARK_AVAILABLE' : 'MARK_SOLD_OUT',
      resource: 'menu',
      resourceId: foodItemId,
      details: { itemName: item.name, isAvailable },
    });

    return saved;
  }

  async deleteItem(id: string) {
    const item = await this.findItemById(id);
    // Soft-deactivate to preserve historical orders
    item.isActive = false;
    return this.itemRepo.save(item);
  }
}
