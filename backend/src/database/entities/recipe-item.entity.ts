import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { FoodItem } from './food-item.entity';
import { InventoryItem } from './inventory-item.entity';

@Entity('recipe_items')
export class RecipeItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  foodItemId: string;

  @ManyToOne(() => FoodItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'foodItemId' })
  foodItem: FoodItem;

  @Column()
  inventoryItemId: string;

  @ManyToOne(() => InventoryItem, (item) => item.recipes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantityRequired: number; // e.g. 0.250 for 250 grams

  @Column({ default: 'kg' })
  unit: string;

  @CreateDateColumn()
  createdAt: Date;
}
