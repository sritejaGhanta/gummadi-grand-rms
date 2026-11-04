import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('admin-dashboard')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Admin metrics dashboard' })
  async getAdminDashboard() {
    return this.service.getAdminDashboard();
  }

  @Get('staff-performance')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Daily staff performance by role and date/range' })
  async getStaffPerformance(
    @Query('range') range?: string,
    @Query('date') date?: string,
  ) {
    return this.service.getDailyStaffPerformance(date, range);
  }

  @Get('staff/:userId')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Individual staff member analytics and trends' })
  async getStaffDetails(
    @Param('userId') userId: string,
    @Query('range') range?: string,
  ) {
    return this.service.getStaffDetails(userId, range);
  }

  @Get('manager-dashboard')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Manager metrics dashboard' })
  async getManagerDashboard() {
    return this.service.getManagerDashboard();
  }

  @Get('chef-dashboard')
  @RequirePermissions('kitchen.view')
  @ApiOperation({ summary: 'Chef metrics dashboard with date filter' })
  async getChefDashboard(
    @CurrentUser() user: any,
    @Query('range') range?: string,
    @Query('chefId') chefId?: string,
  ) {
    const roleName = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').toLowerCase();
    const targetChefId = chefId || (roleName === 'chef' ? user.id : undefined);
    return this.service.getChefDashboard(targetChefId, range);
  }

  @Get('staff-dashboard')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Staff metrics dashboard with date filter' })
  async getStaffDashboard(
    @CurrentUser() user: any,
    @Query('range') range?: string,
    @Query('staffId') staffId?: string,
  ) {
    const roleName = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').toLowerCase();
    const targetStaffId = staffId || (['staff', 'waiter'].includes(roleName) ? user.id : undefined);
    return this.service.getStaffDashboard(targetStaffId, range);
  }
}
