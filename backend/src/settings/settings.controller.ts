import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly service: SettingsService,
    private readonly logService: ActivityLogsService,
  ) {}

  @Get('public')
  @ApiOperation({ summary: 'Get public branding and layout settings' })
  async getPublic() {
    return this.service.getPublicSettings();
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Get all application settings' })
  async getAll() {
    return this.service.getAll();
  }

  @Put()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Update application settings' })
  async update(@Body() body: Record<string, string>, @CurrentUser() user: any) {
    const updated = await this.service.updateSettings(body);
    await this.logService.log({
      userId: user.id,
      username: user.username,
      roleName: user.role?.name,
      action: 'UPDATE_SETTINGS',
      resource: 'settings',
      details: body,
    });
    return updated;
  }
}
