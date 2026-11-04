import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RolePermission } from './role-permission.entity';
import { User } from './user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g. "admin", "manager", "chef", "staff"

  @Column()
  displayName: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isSystem: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => RolePermission, (rp) => rp.role, { cascade: true })
  rolePermissions: RolePermission[];

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
