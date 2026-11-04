import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../database/entities/role.entity';
import { Permission } from '../database/entities/permission.entity';
import { RolePermission } from '../database/entities/role-permission.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';

import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission]), EventsModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
