import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  roleName: string;

  @Column()
  action: string; // "LOGIN", "ORDER_CREATED", "STATUS_CHANGE", "BILL_GENERATED", "PAYMENT_RECORDED", "MENU_UPDATED"

  @Column({ nullable: true })
  resource: string; // "orders", "menu", "bills", "auth"

  @Column({ nullable: true })
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  details: any;

  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
