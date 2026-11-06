import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PlanCode {
  HALF_YEARLY = 'HALF_YEARLY',
  ANNUAL = 'ANNUAL',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: PlanCode,
    unique: true,
  })
  code: PlanCode;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceMonthly: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceYearly: number;

  @Column({ default: 1 })
  maxOutlets: number;

  @Column({ default: 5 })
  maxStaff: number;

  @Column({ default: 15 })
  maxTables: number;

  @Column({ type: 'simple-json', nullable: true })
  features: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
