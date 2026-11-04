import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly service: UsersService,
    private readonly logService: ActivityLogsService,
  ) {}

  @Get()
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Get all users' })
  async getUsers() {
    const list = await this.service.findAll();
    return list.map(({ passwordHash, ...rest }) => rest);
  }

  @Get(':id')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Get user by id' })
  async getUser(@Param('id') id: string) {
    const { passwordHash, ...rest } = await this.service.findById(id);
    return rest;
  }

  @Post()
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Create a new user' })
  async createUser(
    @Body()
    body: {
      username: string;
      password: string;
      name: string;
      email?: string;
      phone?: string;
      roleId?: string;
    },
    @CurrentUser() adminUser: any,
  ) {
    const created = await this.service.createUser(body);
    await this.logService.log({
      userId: adminUser.id,
      username: adminUser.username,
      roleName: adminUser.role?.name,
      action: 'USER_CREATED',
      resource: 'users',
      resourceId: created.id,
      details: { username: created.username, roleId: created.roleId },
    });
    const { passwordHash, ...rest } = created;
    return rest;
  }

  @Put(':id')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Update an existing user' })
  async updateUser(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      roleId?: string;
      isActive?: boolean;
      password?: string;
    },
    @CurrentUser() adminUser: any,
  ) {
    const updated = await this.service.updateUser(id, body);
    await this.logService.log({
      userId: adminUser.id,
      username: adminUser.username,
      roleName: adminUser.role?.name,
      action: 'USER_UPDATED',
      resource: 'users',
      resourceId: updated.id,
      details: { username: updated.username, isActive: updated.isActive },
    });
    const { passwordHash, ...rest } = updated;
    return rest;
  }

  @Put(':id/toggle-status')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Toggle user active/inactive status' })
  async toggleStatus(@Param('id') id: string, @CurrentUser() adminUser: any) {
    const updated = await this.service.toggleActive(id);
    await this.logService.log({
      userId: adminUser.id,
      username: adminUser.username,
      roleName: adminUser.role?.name,
      action: 'USER_STATUS_TOGGLED',
      resource: 'users',
      resourceId: updated.id,
      details: { username: updated.username, isActive: updated.isActive },
    });
    const { passwordHash, ...rest } = updated;
    return rest;
  }

  @Delete(':id')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Delete user account' })
  async deleteUser(@Param('id') id: string, @CurrentUser() adminUser: any) {
    await this.service.deleteUser(id);
    await this.logService.log({
      userId: adminUser.id,
      username: adminUser.username,
      roleName: adminUser.role?.name,
      action: 'USER_DELETED',
      resource: 'users',
      resourceId: id,
    });
    return { success: true, message: 'User deleted successfully' };
  }
}
