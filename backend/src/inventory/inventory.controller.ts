import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { InventoryChangeType } from '../database/entities/inventory-log.entity';

@ApiTags('Inventory & Stock Management')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inventory raw materials' })
  findAll(@Query('category') category?: string) {
    return this.inventoryService.findAll(category);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get low stock alert items' })
  getLowStockAlerts() {
    return this.inventoryService.findLowStockAlerts();
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get stock adjustment / intake logs' })
  getLogs(@Query('inventoryItemId') inventoryItemId?: string) {
    return this.inventoryService.getLogs(inventoryItemId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single inventory item' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new inventory raw material' })
  create(@Body() body: any) {
    return this.inventoryService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory item metadata/threshold' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.inventoryService.update(id, body);
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: 'Adjust stock (Purchase, Usage, Waste, Count Adjustment)' })
  adjustStock(
    @Param('id') id: string,
    @Body() body: { quantity: number; changeType: InventoryChangeType; reason?: string },
    @Request() req: any,
  ) {
    return this.inventoryService.adjustStock(
      id,
      body.quantity,
      body.changeType,
      body.reason || 'Manual Adjustment',
      req.user?.id,
    );
  }

  @Get('recipes/:foodItemId')
  @ApiOperation({ summary: 'Get recipe ingredients for food item' })
  getRecipe(@Param('foodItemId') foodItemId: string) {
    return this.inventoryService.getRecipe(foodItemId);
  }

  @Post('recipes/:foodItemId')
  @ApiOperation({ summary: 'Save recipe ingredients for food item' })
  saveRecipe(
    @Param('foodItemId') foodItemId: string,
    @Body() body: { ingredients: Array<{ inventoryItemId: string; quantityRequired: number; unit?: string }> },
  ) {
    return this.inventoryService.saveRecipe(foodItemId, body.ingredients);
  }
}
