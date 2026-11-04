import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { TableStatus } from '../database/entities/table.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly service: TablesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tables (optionally filter by floorId)' })
  async getTables(@Query('floorId') floorId?: string) {
    return this.service.findAll(floorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get table by id' })
  async getTable(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('tables.manage')
  @ApiOperation({ summary: 'Create new table' })
  async createTable(
    @Body() body: { tableNumber: string; floorId: string; seatingCapacity?: number },
  ) {
    return this.service.create(body);
  }

  @Put(':id')
  @RequirePermissions('tables.manage')
  @ApiOperation({ summary: 'Update table' })
  async updateTable(
    @Param('id') id: string,
    @Body() body: { tableNumber?: string; floorId?: string; seatingCapacity?: number; isActive?: boolean },
  ) {
    return this.service.update(id, body);
  }

  @Put(':id/status')
  @RequirePermissions('orders.create')
  @ApiOperation({ summary: 'Update table status' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: TableStatus,
  ) {
    return this.service.updateStatus(id, status);
  }

  @Delete(':id')
  @RequirePermissions('tables.manage')
  @ApiOperation({ summary: 'Delete table' })
  async deleteTable(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
