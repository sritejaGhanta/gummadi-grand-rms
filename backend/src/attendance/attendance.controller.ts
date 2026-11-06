import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ShiftType, AttendanceStatus } from '../database/entities/staff-attendance.entity';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post('clock-in')
  @ApiOperation({ summary: 'Staff clocks in for today shift' })
  async clockIn(
    @Req() req: any,
    @Body() body: { shift?: ShiftType; notes?: string },
  ) {
    const userId = req.user.id;
    return this.service.clockIn(userId, body.shift, body.notes);
  }

  @Post('clock-out')
  @ApiOperation({ summary: 'Staff clocks out from shift' })
  async clockOut(
    @Req() req: any,
    @Body() body: { notes?: string },
  ) {
    const userId = req.user.id;
    return this.service.clockOut(userId, body.notes);
  }

  @Get('my-status')
  @ApiOperation({ summary: 'Get current user attendance status for today' })
  async getMyStatus(@Req() req: any) {
    return this.service.getMyStatus(req.user.id);
  }

  @Get('today-roster')
  @ApiOperation({ summary: 'View live active shift roster for restaurant' })
  async getTodayRoster(
    @Req() req: any,
    @Query('restaurantId') restaurantId?: string,
  ) {
    const targetRestId = restaurantId || req.user.restaurantId;
    return this.service.getTodayRoster(targetRestId);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly attendance register' })
  async getMonthly(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('restaurantId') restaurantId?: string,
  ) {
    const targetRestId = restaurantId || req.user.restaurantId;
    return this.service.getMonthlyAttendance(targetRestId, month);
  }

  @Post('manual-mark')
  @ApiOperation({ summary: 'Manager marks or overrides staff attendance' })
  async manualMark(
    @Req() req: any,
    @Body()
    body: {
      userId: string;
      restaurantId?: string;
      date: string;
      status: AttendanceStatus;
      shift?: ShiftType;
      totalHours?: number;
      notes?: string;
    },
  ) {
    const restaurantId = body.restaurantId || req.user.restaurantId;
    return this.service.manualMark({
      ...body,
      restaurantId,
    });
  }
}
