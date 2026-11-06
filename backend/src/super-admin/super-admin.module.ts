import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { TenantRestaurant } from '../database/entities/tenant-restaurant.entity';
import { SubscriptionPlan } from '../database/entities/subscription-plan.entity';
import { TenantSubscription } from '../database/entities/tenant-subscription.entity';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { Order } from '../database/entities/order.entity';
import { Bill } from '../database/entities/bill.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantRestaurant,
      SubscriptionPlan,
      TenantSubscription,
      User,
      Role,
      Order,
      Bill,
    ]),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
