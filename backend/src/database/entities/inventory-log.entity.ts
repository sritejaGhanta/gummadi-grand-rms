import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { User } from './user.entity';

export enum InventoryChangeType {
  PURCHASE = 'PURCHASE',
  USAGE = 'USAGE',
  WASTE = 'WASTE',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('inventory_logs')
export class InventoryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  inventoryItemId: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @Column({
    type: 'enum',
    enum: InventoryChangeType,
    default: InventoryChangeType.ADJUSTMENT,
  })
  changeType: InventoryChangeType;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity: number; // positive or negative

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  previousStock: number;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  newStock: number;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  recordedById: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recordedById' })
  recordedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
