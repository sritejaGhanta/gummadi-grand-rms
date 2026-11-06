import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { StaffAttendance, AttendanceStatus, ShiftType } from '../database/entities/staff-attendance.entity';
import { User } from '../database/entities/user.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(StaffAttendance)
    private readonly attendanceRepo: Repository<StaffAttendance>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  // 1. Staff Clock-In
  async clockIn(userId: string, shift: ShiftType = ShiftType.FULL_DAY, notes?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Staff user not found');

    const today = this.getTodayString();
    let record = await this.attendanceRepo.findOne({
      where: { userId, date: today },
    });

    if (record && record.clockIn) {
      return {
        alreadyClockedIn: true,
        record,
        message: `${user.name || user.username} is already clocked in at ${new Date(record.clockIn).toLocaleTimeString()}`,
      };
    }

    const now = new Date();
    // Late check (e.g. if morning shift and clocked in after 10:30 AM)
    const hour = now.getHours();
    const isLate = hour >= 11;

    if (!record) {
      record = this.attendanceRepo.create({
        userId,
        restaurantId: user.restaurantId,
        date: today,
        clockIn: now,
        shift: shift || ShiftType.FULL_DAY,
        status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        notes,
      });
    } else {
      record.clockIn = now;
      record.shift = shift || ShiftType.FULL_DAY;
      record.status = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
      if (notes) record.notes = notes;
    }

    const saved = await this.attendanceRepo.save(record);
    return {
      success: true,
      record: saved,
      message: `Clocked in successfully at ${now.toLocaleTimeString()}`,
    };
  }

  // 2. Staff Clock-Out
  async clockOut(userId: string, notes?: string) {
    const today = this.getTodayString();
    const record = await this.attendanceRepo.findOne({
      where: { userId, date: today },
    });

    if (!record || !record.clockIn) {
      throw new BadRequestException('No clock-in record found for today. Please clock in first.');
    }

    if (record.clockOut) {
      return {
        alreadyClockedOut: true,
        record,
        message: `Already clocked out at ${new Date(record.clockOut).toLocaleTimeString()}`,
      };
    }

    const now = new Date();
    record.clockOut = now;

    const diffMs = now.getTime() - new Date(record.clockIn).getTime();
    const hours = Math.max(0.1, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));
    record.totalHours = hours;

    if (hours < 4 && record.status === AttendanceStatus.PRESENT) {
      record.status = AttendanceStatus.HALF_DAY;
    }

    if (notes) {
      record.notes = record.notes ? `${record.notes} | Out: ${notes}` : notes;
    }

    const saved = await this.attendanceRepo.save(record);
    return {
      success: true,
      record: saved,
      totalHours: hours,
      message: `Clocked out successfully at ${now.toLocaleTimeString()}. Total shift: ${hours} hrs`,
    };
  }

  // 3. Get Current User Today's Status
  async getMyStatus(userId: string) {
    const today = this.getTodayString();
    const record = await this.attendanceRepo.findOne({
      where: { userId, date: today },
    });
    return {
      isClockedIn: !!(record && record.clockIn && !record.clockOut),
      isClockedOut: !!(record && record.clockOut),
      record,
    };
  }

  // 4. Today's Live Active Floor Roster
  async getTodayRoster(restaurantId?: string) {
    const today = this.getTodayString();
    const query = this.attendanceRepo
      .createQueryBuilder('att')
      .leftJoinAndSelect('att.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .where('att.date = :today', { today });

    if (restaurantId) {
      query.andWhere('att.restaurantId = :restaurantId', { restaurantId });
    }

    const todayRecords = await query.getMany();

    // Also get all active staff for the restaurant
    const staffQuery = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.isActive = :isActive', { isActive: true });

    if (restaurantId) {
      staffQuery.andWhere('user.restaurantId = :restaurantId', { restaurantId });
    }

    const allStaff = await staffQuery.getMany();

    // Map roster
    const roster = allStaff.map((staff) => {
      const att = todayRecords.find((r) => r.userId === staff.id);
      return {
        userId: staff.id,
        name: staff.name || staff.username,
        role: staff.role?.displayName || staff.role?.name || 'Staff',
        isClockedIn: !!(att && att.clockIn && !att.clockOut),
        clockInTime: att?.clockIn || null,
        clockOutTime: att?.clockOut || null,
        status: att ? att.status : 'NOT_CLOCKED_IN',
        shift: att?.shift || ShiftType.FULL_DAY,
        totalHours: att?.totalHours || 0,
      };
    });

    const activeCount = roster.filter((r) => r.isClockedIn).length;
    const completedCount = roster.filter((r) => r.clockOutTime).length;

    return {
      date: today,
      activeCount,
      completedCount,
      totalStaff: allStaff.length,
      roster,
    };
  }

  // 5. Monthly Attendance Summary
  async getMonthlyAttendance(restaurantId: string, monthStr?: string) {
    const targetMonth = monthStr || this.getTodayString().slice(0, 7); // YYYY-MM
    const startDate = `${targetMonth}-01`;
    const endDate = `${targetMonth}-31`;

    const records = await this.attendanceRepo.find({
      where: {
        restaurantId,
        date: Between(startDate, endDate),
      },
      relations: ['user', 'user.role'],
      order: { date: 'DESC' },
    });

    // Summary stats
    const totalPresent = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const totalLate = records.filter((r) => r.status === AttendanceStatus.LATE).length;
    const totalHalfDay = records.filter((r) => r.status === AttendanceStatus.HALF_DAY).length;
    const totalHoursAll = records.reduce((sum, r) => sum + Number(r.totalHours || 0), 0);

    return {
      month: targetMonth,
      totalRecords: records.length,
      summary: {
        totalPresent,
        totalLate,
        totalHalfDay,
        totalHours: Number(totalHoursAll.toFixed(1)),
      },
      records,
    };
  }

  // 6. Manual Attendance Override / Mark by Manager
  async manualMark(data: {
    userId: string;
    restaurantId: string;
    date: string;
    status: AttendanceStatus;
    shift?: ShiftType;
    totalHours?: number;
    notes?: string;
  }) {
    let record = await this.attendanceRepo.findOne({
      where: { userId: data.userId, date: data.date },
    });

    if (!record) {
      record = this.attendanceRepo.create({
        userId: data.userId,
        restaurantId: data.restaurantId,
        date: data.date,
        status: data.status,
        shift: data.shift || ShiftType.FULL_DAY,
        totalHours: data.totalHours || 8,
        notes: data.notes || 'Manager Manual Entry',
        clockIn: new Date(`${data.date}T09:30:00`),
        clockOut: new Date(`${data.date}T18:00:00`),
      });
    } else {
      record.status = data.status;
      if (data.shift) record.shift = data.shift;
      if (data.totalHours) record.totalHours = data.totalHours;
      if (data.notes) record.notes = data.notes;
    }

    return this.attendanceRepo.save(record);
  }
}
