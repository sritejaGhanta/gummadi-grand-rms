import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { FoodItem } from './food-item.entity';

@Entity('food_availability')
export class FoodAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  foodItemId: string;

  @OneToOne(() => FoodItem, (item) => item.availability, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'foodItemId' })
  foodItem: FoodItem;

  @Column({ default: true })
  isAvailable: boolean; // true = Available, false = Sold Out

  @Column({ nullable: true })
  updatedByUserId: string;

  @Column({ nullable: true })
  updatedByUsername: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
