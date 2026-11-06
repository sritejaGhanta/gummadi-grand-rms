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

  // --- Day Close (EOD) Endpoints ---
  @Get('day-summary')
  @RequirePermissions('billing.view')
  @ApiOperation({ summary: 'Get live daily cash and sales summary for EOD closing' })
  async getDaySummary(@Query('date') date?: string) {
    return this.service.getDaySummary(date);
  }

  @Post('day-close')
  @RequirePermissions('billing.create')
  @ApiOperation({ summary: 'Submit Day Close EOD Cash Reconciliation' })
  async recordDayClose(
    @Body() body: { date?: string; actualCashCounted: number; notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.recordDayClose(body, user);
  }

  @Get('day-close/history')
  @RequirePermissions('billing.view')
  @ApiOperation({ summary: 'Get previous day close logs' })
  async getDayCloseHistory() {
    return this.service.getDayCloseHistory();
  }

  // --- Customer CRM Endpoints ---
  @Get('customers/lookup')
  @RequirePermissions('billing.view')
  @ApiOperation({ summary: 'Lookup customer by phone for repeat visits & loyalty points' })
  async lookupCustomer(@Query('phone') phone: string) {
    return this.service.lookupCustomer(phone);
  }

  @Get('customers/top')
  @RequirePermissions('billing.view')
  @ApiOperation({ summary: 'Get top spending customers' })
  async getTopCustomers() {
    return this.service.getTopCustomers();
  }

  // --- WhatsApp Digital Bill ---
  @Get(':id/whatsapp')
  @RequirePermissions('billing.view')
  @ApiOperation({ summary: 'Generate formatted WhatsApp digital receipt' })
  async getWhatsAppBill(@Param('id') id: string) {
    return this.service.generateWhatsAppBill(id);
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
  @ApiOperation({ summary: 'Generate a bill for an active order with customer & loyalty support' })
  async generateBill(
    @Body()
    body: {
      orderId: string;
      discountAmount?: number;
      customerName?: string;
      customerPhone?: string;
      redeemPoints?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.service.generateBill(body.orderId, body.discountAmount || 0, user, {
      name: body.customerName,
      phone: body.customerPhone,
      redeemPoints: body.redeemPoints,
    });
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
