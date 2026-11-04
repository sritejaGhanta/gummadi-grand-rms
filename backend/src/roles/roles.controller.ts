import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get('permissions')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Get all available permissions' })
  async getPermissions() {
    return this.service.findAllPermissions();
  }

  @Get()
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Get all roles' })
  async getRoles() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Get role by id' })
  async getRole(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Create new role' })
  async createRole(
    @Body()
    body: {
      name: string;
      displayName: string;
      description?: string;
      permissionIds?: string[];
    },
  ) {
    return this.service.createRole(body);
  }

  @Put(':id')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Update existing role' })
  async updateRole(
    @Param('id') id: string,
    @Body()
    body: {
      displayName?: string;
      description?: string;
      permissionIds?: string[];
    },
  ) {
    return this.service.updateRole(id, body);
  }

  @Delete(':id')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Delete role' })
  async deleteRole(@Param('id') id: string) {
    return this.service.deleteRole(id);
  }
}
