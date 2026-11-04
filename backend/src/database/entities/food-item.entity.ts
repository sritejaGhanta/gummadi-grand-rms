import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { FoodCategory } from './food-category.entity';
import { FoodAvailability } from './food-availability.entity';

@Entity('food_items')
export class FoodItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  categoryId: string;

  @ManyToOne(() => FoodCategory, (cat) => cat.foodItems, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: FoodCategory;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: true })
  isVeg: boolean;

  @Column({ default: 15 })
  preparationTimeMinutes: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => FoodAvailability, (avail) => avail.foodItem, { eager: true, cascade: true })
  availability: FoodAvailability;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
