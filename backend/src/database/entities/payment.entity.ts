import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Bill } from './bill.entity';
import { User } from './user.entity';

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  OTHER = 'OTHER',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  billId: string;

  @ManyToOne(() => Bill, (bill) => bill.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'billId' })
  bill: Bill;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  transactionReference: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  recordedById: string;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recordedById' })
  recordedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
