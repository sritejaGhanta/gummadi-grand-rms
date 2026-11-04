import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FloorsService } from './floors.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('floors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('floors')
export class FloorsController {
  constructor(private readonly service: FloorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all restaurant floors' })
  async getFloors() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get floor by id' })
  async getFloor(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('tables.manage')
  @ApiOperation({ summary: 'Create new floor' })
  async createFloor(@Body() body: { name: string; floorNumber?: number; description?: string }) {
    return this.service.create(body);
  }

  @Put(':id')
  @RequirePermissions('tables.manage')
  @ApiOperation({ summary: 'Update floor' })
  async updateFloor(
    @Param('id') id: string,
    @Body() body: { name?: string; floorNumber?: number; description?: string; isActive?: boolean },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('tables.manage')
  @ApiOperation({ summary: 'Delete floor' })
  async deleteFloor(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
