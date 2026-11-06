import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../database/entities/inventory-item.entity';
import { RecipeItem } from '../database/entities/recipe-item.entity';
import { InventoryLog, InventoryChangeType } from '../database/entities/inventory-log.entity';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(RecipeItem)
    private readonly recipeRepo: Repository<RecipeItem>,
    @InjectRepository(InventoryLog)
    private readonly logRepo: Repository<InventoryLog>,
  ) {}

  async findAll(category?: string): Promise<InventoryItem[]> {
    const qb = this.inventoryRepo.createQueryBuilder('item').where('item.isActive = :isActive', { isActive: true });
    if (category && category !== 'ALL') {
      qb.andWhere('item.category = :category', { category });
    }
    return qb.orderBy('item.name', 'ASC').getMany();
  }

  async findLowStockAlerts(): Promise<InventoryItem[]> {
    return this.inventoryRepo
      .createQueryBuilder('item')
      .where('item.isActive = :isActive', { isActive: true })
      .andWhere('item.currentStock <= item.minAlertThreshold')
      .orderBy('item.currentStock', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<InventoryItem> {
    const item = await this.inventoryRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return item;
  }

  async create(data: Partial<InventoryItem>): Promise<InventoryItem> {
    const item = this.inventoryRepo.create({
      ...data,
      currentStock: Number(data.currentStock) || 0,
      minAlertThreshold: Number(data.minAlertThreshold) || 5.0,
      costPerUnit: Number(data.costPerUnit) || 0,
    });
    const saved = await this.inventoryRepo.save(item);

    // Initial stock log if > 0
    if (saved.currentStock > 0) {
      await this.logRepo.save({
        inventoryItemId: saved.id,
        changeType: InventoryChangeType.PURCHASE,
        quantity: saved.currentStock,
        previousStock: 0,
        newStock: saved.currentStock,
        reason: 'Initial stock intake',
      });
    }

    return saved;
  }

  async update(id: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
    const item = await this.findOne(id);
    Object.assign(item, data);
    return this.inventoryRepo.save(item);
  }

  async adjustStock(
    id: string,
    quantity: number,
    changeType: InventoryChangeType,
    reason: string,
    userId?: string,
  ): Promise<InventoryItem> {
    const item = await this.findOne(id);
    const prev = Number(item.currentStock);
    const qty = Number(quantity);
    let nextStock = prev;

    if (changeType === InventoryChangeType.PURCHASE) {
      nextStock = prev + qty;
    } else if (changeType === InventoryChangeType.USAGE || changeType === InventoryChangeType.WASTE) {
      nextStock = Math.max(0, prev - qty);
    } else if (changeType === InventoryChangeType.ADJUSTMENT) {
      nextStock = qty; // Direct absolute count adjustment
    }

    item.currentStock = nextStock;
    const updated = await this.inventoryRepo.save(item);

    await this.logRepo.save({
      inventoryItemId: item.id,
      changeType,
      quantity: nextStock - prev,
      previousStock: prev,
      newStock: nextStock,
      reason: reason || `Manual adjustment (${changeType})`,
      recordedById: userId,
    });

    return updated;
  }

  async getLogs(inventoryItemId?: string): Promise<InventoryLog[]> {
    const qb = this.logRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.inventoryItem', 'item')
      .leftJoinAndSelect('log.recordedBy', 'user')
      .orderBy('log.createdAt', 'DESC')
      .take(100);

    if (inventoryItemId) {
      qb.where('log.inventoryItemId = :inventoryItemId', { inventoryItemId });
    }

    return qb.getMany();
  }

  // --- Recipe Management ---
  async getRecipe(foodItemId: string): Promise<RecipeItem[]> {
    return this.recipeRepo.find({
      where: { foodItemId },
      relations: ['inventoryItem'],
    });
  }

  async saveRecipe(
    foodItemId: string,
    ingredients: Array<{ inventoryItemId: string; quantityRequired: number; unit?: string }>,
  ): Promise<RecipeItem[]> {
    // Delete existing ingredients for food item
    await this.recipeRepo.delete({ foodItemId });

    if (!ingredients || ingredients.length === 0) return [];

    const entities = ingredients.map((ing) =>
      this.recipeRepo.create({
        foodItemId,
        inventoryItemId: ing.inventoryItemId,
        quantityRequired: Number(ing.quantityRequired) || 0,
        unit: ing.unit || 'kg',
      }),
    );

    return this.recipeRepo.save(entities);
  }

  // Deduct inventory when order is fired
  async deductIngredientsForOrderItems(
    items: Array<{ foodItemId: string; quantity: number }>,
    orderNumber: string,
  ): Promise<void> {
    try {
      for (const item of items) {
        const recipes = await this.getRecipe(item.foodItemId);
        for (const recipe of recipes) {
          const totalUsage = Number(recipe.quantityRequired) * Number(item.quantity);
          if (totalUsage > 0) {
            await this.adjustStock(
              recipe.inventoryItemId,
              totalUsage,
              InventoryChangeType.USAGE,
              `Order auto-deduction: ${orderNumber}`,
            );
          }
        }
      }
    } catch (err) {
      this.logger.error(`Failed to auto-deduct recipe stock: ${err.message}`, err.stack);
    }
  }
}
