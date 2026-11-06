import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RecipeItem } from './recipe-item.entity';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g. "Chicken Raw", "Basmati Rice", "Cooking Oil"

  @Column({ nullable: true })
  sku: string;

  @Column({ default: 'General' })
  category: string; // "Meat & Poultry", "Dairy", "Vegetables", "Grains", "Spices & Oils"

  @Column({ default: 'kg' })
  unit: string; // 'kg', 'g', 'l', 'ml', 'pcs', 'pack'

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  currentStock: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 5.0 })
  minAlertThreshold: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPerUnit: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => RecipeItem, (recipe) => recipe.inventoryItem)
  recipes: RecipeItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
