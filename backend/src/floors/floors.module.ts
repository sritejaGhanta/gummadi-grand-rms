import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Floor } from '../database/entities/floor.entity';
import { RestaurantTable } from '../database/entities/table.entity';
import { FloorsService } from './floors.service';
import { TablesService } from './tables.service';
import { FloorsController } from './floors.controller';
import { TablesController } from './tables.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Floor, RestaurantTable])],
  controllers: [FloorsController, TablesController],
  providers: [FloorsService, TablesService],
  exports: [FloorsService, TablesService],
})
export class FloorsModule {}
