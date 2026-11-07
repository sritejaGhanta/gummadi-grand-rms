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

  @Get('platform-users')
  @ApiOperation({ summary: 'List all platform users across all restaurants' })
  async getPlatformUsers() {
    return this.service.getAllPlatformUsers();
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

  // ==========================================
  // LANDING CMS & LEADS
  // ==========================================
  @Get('landing-cms')
  @ApiOperation({ summary: 'Get dynamic landing page CMS settings' })
  async getLandingCms() {
    return this.service.getLandingCmsSettings();
  }

  @Patch('landing-cms')
  @ApiOperation({ summary: 'Update dynamic landing page CMS settings' })
  async updateLandingCms(@Body() body: any) {
    return this.service.updateLandingCmsSettings(body);
  }

  @Post('demo-inquiry')
  @ApiOperation({ summary: 'Public demo inquiry form submitted by restaurant owners' })
  async submitDemoInquiry(
    @Body()
    body: {
      restaurantName: string;
      ownerName: string;
      phone: string;
      email?: string;
      city?: string;
      seatingCapacity?: string;
      preferredPlan?: string;
      notes?: string;
    },
  ) {
    return this.service.createDemoLead(body);
  }

  @Get('leads')
  @ApiOperation({ summary: 'Get all demo inquiries / leads' })
  async getLeads() {
    return this.service.getAllLeads();
  }

  @Patch('leads/:id/status')
  @ApiOperation({ summary: 'Update lead status' })
  async updateLeadStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.service.updateLeadStatus(id, body.status, body.notes);
  }

  @Post('leads/:id/convert')
  @ApiOperation({ summary: '1-Click convert demo lead to active tenant' })
  async convertLead(@Param('id') id: string) {
    return this.service.convertLeadToTenant(id);
  }

  // ==========================================
  // CAPABILITIES & PERMISSION MATRIX
  // ==========================================
  @Patch('restaurants/:id/capabilities')
  @ApiOperation({ summary: 'Update licensed capabilities for a restaurant' })
  async updateCapabilities(
    @Param('id') id: string,
    @Body() capabilities: any,
  ) {
    return this.service.updateRestaurantCapabilities(id, capabilities);
  }

  @Get('permissions/matrix')
  @ApiOperation({ summary: 'Get full roles & permissions matrix' })
  async getPermissionMatrix() {
    return this.service.getPermissionMatrix();
  }

  @Post('permissions/matrix')
  @ApiOperation({ summary: 'Update role permissions for a role' })
  async updateRolePermissions(
    @Body() body: { roleName: string; permissionKeys: string[] },
  ) {
    return this.service.updateRolePermissions(body.roleName, body.permissionKeys);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Toggle user active/inactive status' })
  async toggleUserStatus(@Param('id') id: string) {
    return this.service.toggleUserStatus(id);
  }

  @Post('users/:id/reset-password')
  @ApiOperation({ summary: 'Reset a user password' })
  async resetUserPassword(
    @Param('id') id: string,
    @Body('password') password?: string,
  ) {
    return this.service.resetUserPassword(id, password);
  }
}
