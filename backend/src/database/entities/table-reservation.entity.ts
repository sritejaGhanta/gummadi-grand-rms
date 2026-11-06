import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RestaurantTable } from './table.entity';

@Entity('table_reservations')
export class TableReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  restaurantId: string;

  @Column()
  tableId: string;

  @ManyToOne(() => RestaurantTable, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tableId' })
  table: RestaurantTable;

  @Column()
  customerName: string;

  @Column()
  customerPhone: string;

  @Column({ default: 2 })
  guestCount: number;

  @Column()
  reservationDate: string; // YYYY-MM-DD

  @Column()
  reservationTime: string; // HH:mm

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  advancePaid: number;

  @Column({ type: 'text', nullable: true })
  specialRequests: string;

  @Column({ default: 'CONFIRMED' })
  status: string; // 'CONFIRMED', 'SEATED', 'CANCELLED', 'COMPLETED'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
