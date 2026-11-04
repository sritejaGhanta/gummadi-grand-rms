import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { BillStatus } from '../database/entities/bill.entity';
import { PaymentMethod } from '../database/entities/payment.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get()
  @RequirePermissions('billing.view')
  @ApiOperation({ summary: 'Get all bills' })
  async getBills(@Query('status') status?: BillStatus) {
    return this.service.findAll(status);
  }

  @Get(':id')
  @RequirePermissions('billing.view')
  @ApiOperation({ summary: 'Get bill by id' })
  async getBill(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('order/:orderId')
  @RequirePermissions('billing.view')
  @ApiOperation({ summary: 'Get bill for an order' })
  async getBillByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrderId(orderId);
  }

  @Post('generate')
  @RequirePermissions('billing.create')
  @ApiOperation({ summary: 'Generate a bill for an active order' })
  async generateBill(
    @Body() body: { orderId: string; discountAmount?: number },
    @CurrentUser() user: any,
  ) {
    return this.service.generateBill(body.orderId, body.discountAmount || 0, user);
  }

  @Post(':id/payment')
  @RequirePermissions('billing.create')
  @ApiOperation({ summary: 'Record payment for a bill' })
  async recordPayment(
    @Param('id') id: string,
    @Body()
    body: {
      amount: number;
      paymentMethod: PaymentMethod;
      transactionReference?: string;
      notes?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.service.recordPayment(
      id,
      body.amount,
      body.paymentMethod,
      body.transactionReference,
      body.notes,
      user,
    );
  }
}
