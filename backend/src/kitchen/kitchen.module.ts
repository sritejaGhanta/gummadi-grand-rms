import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from '../database/entities/order-item.entity';
import { Order } from '../database/entities/order.entity';
import { User } from '../database/entities/user.entity';
import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrderItem, Order, User])],
  controllers: [KitchenController],
  providers: [KitchenService],
  exports: [KitchenService],
})
export class KitchenModule {}
