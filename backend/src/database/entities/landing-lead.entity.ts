import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('landing_leads')
export class LandingLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  restaurantName: string;

  @Column()
  ownerName: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: 'Hyderabad' })
  city: string;

  @Column({ nullable: true })
  seatingCapacity: string;

  @Column({ default: '1_YEAR' })
  preferredPlan: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: 'NEW' })
  status: string; // 'NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'CONVERTED', 'REJECTED'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
