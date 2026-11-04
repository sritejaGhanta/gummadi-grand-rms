import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantTable, TableStatus } from '../database/entities/table.entity';
import { Floor } from '../database/entities/floor.entity';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(Floor)
    private readonly floorRepo: Repository<Floor>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findAll(floorId?: string) {
    const where: any = {};
    if (floorId) {
      where.floorId = floorId;
    }
    return this.tableRepo.find({
      where,
      relations: ['floor'],
      order: { tableNumber: 'ASC' },
    });
  }

  async findOne(id: string) {
    const table = await this.tableRepo.findOne({
      where: { id },
      relations: ['floor'],
    });
    if (!table) {
      throw new NotFoundException(`Table ${id} not found`);
    }
    return table;
  }

  async create(data: { tableNumber: string; floorId: string; seatingCapacity?: number }) {
    if (!data?.tableNumber || !data.tableNumber.trim() || !data?.floorId) {
      throw new BadRequestException('Table number and floorId are required');
    }
    if (data.seatingCapacity !== undefined && data.seatingCapacity <= 0) {
      throw new BadRequestException('Seating capacity must be a positive number');
    }
    const floor = await this.floorRepo.findOne({ where: { id: data.floorId } });
    if (!floor) {
      throw new NotFoundException(`Floor with id "${data.floorId}" not found`);
    }
    const existing = await this.tableRepo.findOne({ where: { tableNumber: data.tableNumber.trim() } });
    if (existing) {
      throw new BadRequestException(`Table number "${data.tableNumber}" already exists`);
    }
    const table = this.tableRepo.create({
      tableNumber: data.tableNumber.trim(),
      floorId: data.floorId,
      seatingCapacity: data.seatingCapacity || 4,
      status: TableStatus.AVAILABLE,
      isActive: true,
    });
    const saved = await this.tableRepo.save(table);
    this.eventsGateway.notifyTableStatus(saved);
    return saved;
  }

  async update(
    id: string,
    data: { tableNumber?: string; floorId?: string; seatingCapacity?: number; isActive?: boolean },
  ) {
    const table = await this.findOne(id);
    if (data.tableNumber) table.tableNumber = data.tableNumber;
    if (data.floorId) table.floorId = data.floorId;
    if (data.seatingCapacity) table.seatingCapacity = data.seatingCapacity;
    if (data.isActive !== undefined) table.isActive = data.isActive;
    const saved = await this.tableRepo.save(table);
    this.eventsGateway.notifyTableStatus(saved);
    return saved;
  }

  async updateStatus(id: string, status: TableStatus) {
    const table = await this.findOne(id);
    table.status = status;
    const saved = await this.tableRepo.save(table);
    this.eventsGateway.notifyTableStatus(saved);
    return saved;
  }

  async delete(id: string) {
    const table = await this.findOne(id);
    if (table.status !== TableStatus.AVAILABLE) {
      throw new BadRequestException('Cannot delete a table that is currently occupied or billing');
    }
    return this.tableRepo.remove(table);
  }
}
