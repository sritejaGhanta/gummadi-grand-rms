import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('activity-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly service: ActivityLogsService) {}

  @Get()
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'Get audit and activity logs' })
  async getLogs(
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ) {
    return this.service.findAll(+limit, +offset);
  }
}
