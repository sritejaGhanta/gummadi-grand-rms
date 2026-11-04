import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('application_settings')
export class ApplicationSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ default: 'general' })
  category: string; // "branding", "restaurant", "layout", "tax"

  @Column({ nullable: true })
  description: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
