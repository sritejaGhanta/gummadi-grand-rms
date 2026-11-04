import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../database/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll() {
    return this.userRepo.find({
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByUsername(username: string) {
    return this.userRepo.findOne({
      where: { username },
      relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
    });
  }

  async createUser(data: {
    username: string;
    password: string;
    name: string;
    email?: string;
    phone?: string;
    roleId?: string;
  }) {
    const existing = await this.userRepo.findOne({ where: { username: data.username } });
    if (existing) {
      throw new BadRequestException(`Username "${data.username}" is already taken`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = this.userRepo.create({
      username: data.username,
      passwordHash,
      name: data.name,
      email: data.email,
      phone: data.phone,
      roleId: data.roleId,
      isActive: true,
    });

    return this.userRepo.save(user);
  }

  async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      roleId?: string;
      isActive?: boolean;
      password?: string;
    },
  ) {
    const user = await this.findById(id);
    if (data.name) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.roleId) user.roleId = data.roleId;
    if (data.isActive !== undefined) user.isActive = data.isActive;
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(data.password, salt);
    }
    return this.userRepo.save(user);
  }

  async updateLastLogin(id: string) {
    await this.userRepo.update(id, { lastLoginAt: new Date() });
  }

  async updateLastLogout(id: string) {
    await this.userRepo.update(id, { lastLogoutAt: new Date() });
  }

  async toggleActive(id: string) {
    const user = await this.findById(id);
    user.isActive = !user.isActive;
    return this.userRepo.save(user);
  }

  async deleteUser(id: string) {
    const user = await this.findById(id);
    if (user.username === 'admin') {
      throw new BadRequestException('Master admin user cannot be deleted');
    }
    return this.userRepo.remove(user);
  }
}
