import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Floor } from '../database/entities/floor.entity';
import { RestaurantTable } from '../database/entities/table.entity';

@Injectable()
export class FloorsService {
  constructor(
    @InjectRepository(Floor)
    private readonly floorRepo: Repository<Floor>,
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
  ) {}

  async findAll(restaurantId?: string) {
    if (restaurantId) {
      return this.floorRepo.find({
        where: { restaurantId },
        relations: ['tables'],
        order: { floorNumber: 'ASC', name: 'ASC' },
      });
    }
    return this.floorRepo.find({
      relations: ['tables'],
      order: { floorNumber: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const floor = await this.floorRepo.findOne({
      where: { id },
      relations: ['tables'],
    });
    if (!floor) {
      throw new NotFoundException(`Floor ${id} not found`);
    }
    return floor;
  }

  async create(data: { name: string; floorNumber?: number; description?: string }) {
    if (!data?.name || !data.name.trim()) {
      throw new BadRequestException('Floor name is required');
    }
    const floor = this.floorRepo.create({
      name: data.name.trim(),
      floorNumber: data.floorNumber || 0,
      description: data.description,
      isActive: true,
    });
    return this.floorRepo.save(floor);
  }

  async update(id: string, data: { name?: string; floorNumber?: number; description?: string; isActive?: boolean }) {
    const floor = await this.findOne(id);
    if (data.name) floor.name = data.name;
    if (data.floorNumber !== undefined) floor.floorNumber = data.floorNumber;
    if (data.description !== undefined) floor.description = data.description;
    if (data.isActive !== undefined) floor.isActive = data.isActive;
    return this.floorRepo.save(floor);
  }

  async delete(id: string) {
    const count = await this.tableRepo.count({ where: { floorId: id } });
    if (count > 0) {
      throw new BadRequestException('Cannot delete a floor that still has tables assigned to it.');
    }
    const floor = await this.findOne(id);
    return this.floorRepo.remove(floor);
  }
}
