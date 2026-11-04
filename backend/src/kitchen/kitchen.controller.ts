import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KitchenService } from './kitchen.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('kitchen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly service: KitchenService) {}

  @Get('history')
  @RequirePermissions('kitchen.view')
  @ApiOperation({ summary: 'Get kitchen prepared dishes history with date filter, search & metrics' })
  async getKitchenHistory(
    @CurrentUser() user: any,
    @Query('range') range?: string,
    @Query('chefId') chefId?: string,
    @Query('dietary') dietary?: string,
    @Query('search') search?: string,
  ) {
    const roleName = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').toLowerCase();
    // When logged in as chef, strictly filter by this chef's user.id only
    const targetChefId = roleName === 'chef' ? user.id : (chefId || undefined);
    return this.service.getKitchenPreparationHistory({
      chefId: targetChefId,
      range,
      dietary,
      search,
    });
  }

  @Get('tasks')
  @RequirePermissions('kitchen.view')
  @ApiOperation({ summary: 'Get active kitchen orders and tasks' })
  async getKitchenTasks() {
    return this.service.getActiveKitchenTasks();
  }

  @Get('chefs')
  @RequirePermissions('kitchen.view')
  @ApiOperation({ summary: 'Get active kitchen chefs list for workstation assignments' })
  async getKitchenChefs() {
    return this.service.getKitchenChefs();
  }

  @Put('items/:id/accept')
  @RequirePermissions('kitchen.accept')
  @ApiOperation({ summary: 'Chef accepts an order item (supports admin delegating to specific chef)' })
  async acceptItem(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { chefId?: string },
  ) {
    return this.service.acceptItem(id, user, body?.chefId);
  }

  @Put('items/:id/prepare')
  @RequirePermissions('kitchen.prepare')
  @ApiOperation({ summary: 'Chef starts preparing an order item' })
  async startPreparing(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { chefId?: string },
  ) {
    return this.service.startPreparing(id, user, body?.chefId);
  }

  @Put('items/:id/ready')
  @RequirePermissions('kitchen.mark_ready')
  @ApiOperation({ summary: 'Chef marks order item as ready to serve' })
  async markReady(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { chefId?: string },
  ) {
    return this.service.markItemReady(id, user, body?.chefId);
  }

  @Put('items/:id/assign-chef')
  @RequirePermissions('kitchen.accept')
  @ApiOperation({ summary: 'Reassign an order item to another chef' })
  async assignChef(
    @Param('id') id: string,
    @Body('chefId') chefId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.assignChef(id, chefId, user);
  }
}
