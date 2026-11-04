import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  targetRole: string; // e.g. "chef", "staff", "manager", "admin", "all"

  @Column({ nullable: true })
  targetUserId: string;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ default: 'INFO' })
  type: string; // "ORDER_NEW", "ORDER_READY", "BILL_REQUEST", "MENU_ALERT", "INFO"

  @Column({ nullable: true })
  referenceId: string; // orderId or billId

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
