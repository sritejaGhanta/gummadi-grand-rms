import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicRestaurantController } from './public-restaurant.controller';
import { TenantRestaurant } from '../database/entities/tenant-restaurant.entity';
import { RestaurantTable } from '../database/entities/table.entity';
import { FoodCategory } from '../database/entities/food-category.entity';
import { FoodItem } from '../database/entities/food-item.entity';
import { Order } from '../database/entities/order.entity';
import { OrderItem } from '../database/entities/order-item.entity';
import { TableReservation } from '../database/entities/table-reservation.entity';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantRestaurant,
      RestaurantTable,
      FoodCategory,
      FoodItem,
      Order,
      OrderItem,
      TableReservation,
    ]),
    EventsModule,
  ],
  controllers: [PublicRestaurantController],
})
export class PublicRestaurantModule {}
