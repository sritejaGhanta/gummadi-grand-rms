import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RestaurantTable } from './table.entity';

@Entity('floors')
export class Floor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g. "Ground Floor", "First Floor", "Rooftop"

  @Column({ default: 0 })
  floorNumber: number;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => RestaurantTable, (table) => table.floor)
  tables: RestaurantTable[];
}
