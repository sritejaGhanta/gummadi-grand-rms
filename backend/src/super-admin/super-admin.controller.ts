import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { TenantStatus } from '../database/entities/tenant-restaurant.entity';
import { PlanCode } from '../database/entities/subscription-plan.entity';
import { SubscriptionCycle } from '../database/entities/tenant-subscription.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('super-admin')
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get global SaaS platform metrics' })
  async getMetrics() {
    return this.service.getPlatformMetrics();
  }

  @Get('restaurants')
  @ApiOperation({ summary: 'List all onboarded tenant restaurants' })
  async getAllRestaurants() {
    return this.service.getAllRestaurants();
  }

  @Post('restaurants')
  @ApiOperation({ summary: 'Onboard a new restaurant tenant' })
  async createRestaurant(
    @Body()
    body: {
      name: string;
      slug?: string;
      cuisine?: string;
      contactEmail: string;
      contactPhone: string;
      address?: string;
      city?: string;
      planCode?: PlanCode;
      ownerName: string;
      ownerUsername: string;
      ownerPassword?: string;
    },
  ) {
    return this.service.createRestaurant(body);
  }

  @Patch('restaurants/:id/status')
  @ApiOperation({ summary: 'Update tenant status (ACTIVE, SUSPENDED, TRIAL, EXPIRED)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: TenantStatus,
  ) {
    return this.service.updateTenantStatus(id, status);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get all SaaS subscription plans' })
  async getPlans() {
    return this.service.getPlans();
  }

  @Post('subscriptions/record')
  @ApiOperation({ summary: 'Record subscription payment or renewal' })
  async recordSubscription(
    @Body()
    body: {
      restaurantId: string;
      planId: string;
      billingCycle: SubscriptionCycle;
      amountPaid: number;
      paymentMethod: string;
      transactionReference?: string;
      notes?: string;
    },
  ) {
    return this.service.recordSubscriptionPayment(body);
  }

  // Tenant / Restaurant Staff Operations
  @Get('restaurants/:id/staff')
  @ApiOperation({ summary: 'Get staff for a restaurant' })
  async getStaff(@Param('id') id: string) {
    return this.service.getRestaurantStaff(id);
  }

  @Post('restaurants/:id/staff')
  @ApiOperation({ summary: 'Add staff member to a restaurant' })
  async addStaff(
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      username: string;
      password?: string;
      roleName: 'manager' | 'staff' | 'chef';
      phone?: string;
      email?: string;
    },
  ) {
    return this.service.createRestaurantStaff(id, body);
  }
}
