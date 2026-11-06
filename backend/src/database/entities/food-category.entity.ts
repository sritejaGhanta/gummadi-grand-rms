import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { FoodItem } from './food-item.entity';

@Entity('food_categories')
export class FoodCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // "Starters", "Biryani", "Main Course", "Beverages", "Desserts"

  @Column({ nullable: true })
  restaurantId: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 0 })
  displayOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => FoodItem, (item) => item.category)
  foodItems: FoodItem[];
}
