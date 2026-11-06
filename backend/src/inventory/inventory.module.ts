import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from '../database/entities/inventory-item.entity';
import { RecipeItem } from '../database/entities/recipe-item.entity';
import { InventoryLog } from '../database/entities/inventory-log.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem, RecipeItem, InventoryLog])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
