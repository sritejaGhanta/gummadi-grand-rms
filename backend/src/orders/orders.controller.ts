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
  async getActiveByTable(@Param('tableId') tableId: string, @Query('subOrder') subOrder?: string) {
    return this.service.findActiveByTable(tableId, subOrder);
  }

  @Get('table/:tableId/active-all')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Get all active sub-orders for a shared table' })
  async getAllActiveByTable(@Param('tableId') tableId: string) {
    return this.service.findAllActiveByTable(tableId);
  }

  @Get(':id')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Get order by id' })
  async getOrder(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('orders.create')
  @ApiOperation({ summary: 'Create or add to an order for a table (supports sub-table sharing)' })
  async createOrder(
    @Body()
    body: {
      tableId: string;
      items: Array<{ foodItemId: string; quantity: number; specialInstructions?: string; portion?: string; unitPrice?: number }>;
      customerName?: string;
      notes?: string;
      subOrder?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.service.createOrder(
      body.tableId,
      body.items,
      body.customerName,
      body.notes,
      user,
      body.subOrder || 'A',
    );
  }

  @Put('items/:itemId/deliver')
  @RequirePermissions('orders.update')
  @ApiOperation({ summary: 'Mark an item as delivered to the customer table' })
  async markItemDelivered(@Param('itemId') itemId: string, @CurrentUser() user: any) {
    return this.service.markItemDelivered(itemId, user);
  }

  @Put('items/:itemId/cancel')
  @RequirePermissions('orders.update')
  @ApiOperation({ summary: 'Cancel an item from an active customer order' })
  async cancelOrderItem(
    @Param('itemId') itemId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.service.cancelOrderItem(itemId, reason, user);
  }

  @Post('tables/:tableId/request-bill')
  @RequirePermissions('orders.update')
  @ApiOperation({ summary: 'Staff requests bill generation for a table' })
  async requestBill(
    @Param('tableId') tableId: string,
    @Body() body: { orderId?: string; subOrder?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.requestBill(tableId, user, body?.orderId, body?.subOrder);
  }

  @Post(':id/transfer-table')
  @RequirePermissions('orders.update')
  @ApiOperation({ summary: 'Shift/transfer active order to a new table' })
  async transferTable(
    @Param('id') id: string,
    @Body('newTableId') newTableId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.transferTable(id, newTableId, user);
  }

  @Post(':id/merge-table')
  @RequirePermissions('orders.update')
  @ApiOperation({ summary: 'Merge an active table into target order' })
  async mergeTable(
    @Param('id') id: string,
    @Body('sourceTableId') sourceTableId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.mergeTable(id, sourceTableId, user);
  }
}
