import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bill } from '../database/entities/bill.entity';
import { Payment } from '../database/entities/payment.entity';
import { Order } from '../database/entities/order.entity';
import { RestaurantTable } from '../database/entities/table.entity';
import { ApplicationSetting } from '../database/entities/application-setting.entity';
import { Customer } from '../database/entities/customer.entity';
import { DayClose } from '../database/entities/day-close.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Bill, Payment, Order, RestaurantTable, ApplicationSetting, Customer, DayClose])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
