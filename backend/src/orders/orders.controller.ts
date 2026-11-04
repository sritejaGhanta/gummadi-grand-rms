import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderStatus } from '../database/entities/order.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Get all orders' })
  async getOrders(@Query('status') status?: OrderStatus) {
    return this.service.findAll(status);
  }

  @Get('table/:tableId/active')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Get active order for a table' })
  async getActiveByTable(@Param('tableId') tableId: string) {
    return this.service.findActiveByTable(tableId);
  }

  @Get(':id')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Get order by id' })
  async getOrder(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('orders.create')
  @ApiOperation({ summary: 'Create or add to an order for a table' })
  async createOrder(
    @Body()
    body: {
      tableId: string;
      items: Array<{ foodItemId: string; quantity: number; specialInstructions?: string }>;
      customerName?: string;
      notes?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.service.createOrder(body.tableId, body.items, body.customerName, body.notes, user);
  }

  @Put('items/:itemId/deliver')
  @RequirePermissions('orders.update')
  @ApiOperation({ summary: 'Mark an item as delivered to the customer table' })
  async markItemDelivered(@Param('itemId') itemId: string, @CurrentUser() user: any) {
    return this.service.markItemDelivered(itemId, user);
  }

  @Post('tables/:tableId/request-bill')
  @RequirePermissions('orders.update')
  @ApiOperation({ summary: 'Staff requests bill generation for a table' })
  async requestBill(@Param('tableId') tableId: string, @CurrentUser() user: any) {
    return this.service.requestBill(tableId, user);
  }
}
