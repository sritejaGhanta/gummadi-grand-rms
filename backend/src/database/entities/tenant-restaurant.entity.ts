import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum TenantStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

@Entity('tenant_restaurants')
export class TenantRestaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  brandLogo: string;

  @Column({ nullable: true })
  cuisine: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({ nullable: true })
  gstNumber: string;

  @Column({ nullable: true })
  fssaiNumber: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.TRIAL,
  })
  status: TenantStatus;

  @Column({ nullable: true })
  planId: string;

  @Column({ type: 'timestamp', nullable: true })
  trialEndsAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionEndsAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  capabilities: {
    posEnabled: boolean;
    kdsEnabled: boolean;
    qrOrderEnabled: boolean;
    tableSharingEnabled: boolean;
    inventoryEnabled: boolean;
    attendanceEnabled: boolean;
    dayCloseEnabled: boolean;
    reservationsEnabled: boolean;
    whatsappBillsEnabled: boolean;
    discountEnabled: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
