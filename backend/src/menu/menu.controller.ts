import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('menu')
export class MenuController {
  constructor(private readonly service: MenuService) {}

  // Categories
  @Get('categories')
  @ApiOperation({ summary: 'Get all food categories' })
  async getCategories() {
    return this.service.findAllCategories();
  }

  @Post('categories')
  @RequirePermissions('menu.manage')
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Body() body: { name: string; description?: string; displayOrder?: number }) {
    return this.service.createCategory(body);
  }

  @Put('categories/:id')
  @RequirePermissions('menu.manage')
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; displayOrder?: number; isActive?: boolean },
  ) {
    return this.service.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @RequirePermissions('menu.manage')
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }

  // Items
  @Get('items')
  @ApiOperation({ summary: 'Get all food items' })
  async getItems(
    @Query('categoryId') categoryId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.findAllItems(categoryId, activeOnly === 'true');
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get item by id' })
  async getItem(@Param('id') id: string) {
    return this.service.findItemById(id);
  }

  @Post('items')
  @RequirePermissions('menu.manage')
  @ApiOperation({ summary: 'Create food item' })
  async createItem(
    @Body()
    body: {
      categoryId: string;
      name: string;
      description?: string;
      price: number;
      imageUrl?: string;
      isVeg?: boolean;
      preparationTimeMinutes?: number;
    },
  ) {
    return this.service.createItem(body);
  }

  @Put('items/:id')
  @RequirePermissions('menu.manage')
  @ApiOperation({ summary: 'Update food item' })
  async updateItem(
    @Param('id') id: string,
    @Body()
    body: {
      categoryId?: string;
      name?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
      isVeg?: boolean;
      preparationTimeMinutes?: number;
      isActive?: boolean;
    },
  ) {
    return this.service.updateItem(id, body);
  }

  @Put('items/:id/availability')
  @RequirePermissions('menu.availability.update')
  @ApiOperation({ summary: 'Update food item availability (Available vs Sold Out)' })
  async setAvailability(
    @Param('id') id: string,
    @Body('isAvailable') isAvailable: boolean,
    @CurrentUser() user: any,
  ) {
    return this.service.setAvailability(id, isAvailable, user);
  }

  @Delete('items/:id')
  @RequirePermissions('menu.manage')
  @ApiOperation({ summary: 'Soft delete / deactivate food item' })
  async deleteItem(@Param('id') id: string) {
    return this.service.deleteItem(id);
  }
}
