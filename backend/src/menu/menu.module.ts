import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodCategory } from '../database/entities/food-category.entity';
import { FoodItem } from '../database/entities/food-item.entity';
import { FoodAvailability } from '../database/entities/food-availability.entity';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FoodCategory, FoodItem, FoodAvailability])],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
