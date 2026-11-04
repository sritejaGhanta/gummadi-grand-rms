import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { RestaurantTable } from './table.entity';
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string; // e.g. "ORD-20261031-001"

  @Column()
  tableId: string;

  @ManyToOne(() => RestaurantTable, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tableId' })
  table: RestaurantTable;

  @Column({ nullable: true })
  waiterId: string;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'waiterId' })
  waiter: User;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.ACTIVE,
  })
  status: OrderStatus;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
