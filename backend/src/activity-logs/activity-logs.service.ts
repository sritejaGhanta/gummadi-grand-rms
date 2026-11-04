import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../database/entities/activity-log.entity';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly logRepo: Repository<ActivityLog>,
  ) {}

  async log(data: {
    userId?: string;
    username?: string;
    roleName?: string;
    action: string;
    resource?: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
  }): Promise<ActivityLog> {
    const entry = this.logRepo.create(data);
    return this.logRepo.save(entry);
  }

  async findAll(limit = 100, offset = 0) {
    const [items, total] = await this.logRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }
}
