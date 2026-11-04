import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../database/entities/role.entity';
import { Permission } from '../database/entities/permission.entity';
import { RolePermission } from '../database/entities/role-permission.entity';

import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermRepo: Repository<RolePermission>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findAll() {
    return this.roleRepo.find({
      relations: ['rolePermissions', 'rolePermissions.permission'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string) {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }
    return role;
  }

  async findAllPermissions() {
    return this.permRepo.find({ order: { module: 'ASC', key: 'ASC' } });
  }

  async createRole(data: { name: string; displayName: string; description?: string; permissionIds?: string[] }) {
    const existing = await this.roleRepo.findOne({ where: { name: data.name.toLowerCase() } });
    if (existing) {
      throw new BadRequestException(`Role with name "${data.name}" already exists`);
    }

    const role = this.roleRepo.create({
      name: data.name.toLowerCase(),
      displayName: data.displayName,
      description: data.description,
      isSystem: false,
    });
    const saved = await this.roleRepo.save(role);

    if (data.permissionIds && data.permissionIds.length > 0) {
      await this.assignPermissions(saved.id, data.permissionIds);
    }

    return this.findOne(saved.id);
  }

  async updateRole(
    id: string,
    data: { displayName?: string; description?: string; permissionIds?: string[] },
  ) {
    const role = await this.findOne(id);
    if (data.displayName) role.displayName = data.displayName;
    if (data.description !== undefined) role.description = data.description;
    await this.roleRepo.save(role);

    if (data.permissionIds) {
      await this.assignPermissions(id, data.permissionIds);
    }

    this.eventsGateway.notifyPermissionsUpdated(id);

    return this.findOne(id);
  }

  async assignPermissions(roleId: string, permissionIds: string[]) {
    // Delete existing
    await this.rolePermRepo.delete({ roleId });

    // Insert new
    if (permissionIds.length > 0) {
      const entries = permissionIds.map((pId) =>
        this.rolePermRepo.create({ roleId, permissionId: pId }),
      );
      await this.rolePermRepo.save(entries);
    }
  }

  async deleteRole(id: string) {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system-defined roles');
    }
    return this.roleRepo.remove(role);
  }
}
