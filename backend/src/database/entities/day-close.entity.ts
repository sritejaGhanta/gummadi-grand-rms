import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('day_closes')
export class DayClose {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  closeDate: string; // YYYY-MM-DD

  @Column({ nullable: true })
  closedById: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closedById' })
  closedBy: User;

  @Column({ default: 0 })
  totalOrders: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSales: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCash: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalUpi: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCard: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalDiscount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalTax: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  expectedCash: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  actualCashCounted: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  variance: number; // actual - expected (negative = shortage, positive = excess)

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
