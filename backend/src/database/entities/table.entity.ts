import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Floor } from './floor.entity';

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  BILLING = 'BILLING',
}

@Entity('tables')
export class RestaurantTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tableNumber: string; // e.g. "T-01", "T-02"

  @Column({ nullable: true })
  restaurantId: string;

  @Column()
  floorId: string;

  @ManyToOne(() => Floor, (floor) => floor.tables, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'floorId' })
  floor: Floor;

  @Column({ default: 4 })
  seatingCapacity: number;

  @Column({
    type: 'enum',
    enum: TableStatus,
    default: TableStatus.AVAILABLE,
  })
  status: TableStatus;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
