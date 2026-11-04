import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../database/entities/order.entity';
import { OrderItem } from '../database/entities/order-item.entity';
import { Bill } from '../database/entities/bill.entity';
import { Payment } from '../database/entities/payment.entity';
import { User } from '../database/entities/user.entity';
import { RestaurantTable } from '../database/entities/table.entity';
import { Floor } from '../database/entities/floor.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Bill, Payment, User, RestaurantTable, Floor]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
