import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { RestaurantTable } from './table.entity';
import { User } from './user.entity';
import { Payment } from './payment.entity';

export enum BillStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  VOID = 'VOID',
}

@Entity('bills')
export class Bill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  billNumber: string; // e.g. "BILL-20261031-001"

  @Column({ unique: true })
  orderId: string;

  @ManyToOne(() => Order, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  tableId: string;

  @ManyToOne(() => RestaurantTable, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tableId' })
  table: RestaurantTable;

  @Column({ default: 'A', length: 10 })
  subOrder: string;

  @Column({ nullable: true })
  generatedById: string;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'generatedById' })
  generatedBy: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  taxPercentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  loyaltyPointsEarned: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  loyaltyPointsRedeemed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  grandTotal: number;

  @Column({
    type: 'enum',
    enum: BillStatus,
    default: BillStatus.UNPAID,
  })
  status: BillStatus;

  @OneToMany(() => Payment, (payment) => payment.bill)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
