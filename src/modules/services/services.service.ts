import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalonService } from './entities/service.entity';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(SalonService)
    private readonly serviceRepo: Repository<SalonService>,
  ) {}

  create(dto: CreateServiceDto): Promise<SalonService> {
    const service = this.serviceRepo.create(dto);
    return this.serviceRepo.save(service);
  }

  findAll(activeOnly = false): Promise<SalonService[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.serviceRepo.find({ where, order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<SalonService> {
    const service = await this.serviceRepo.findOne({ where: { id } });
    if (!service) throw new NotFoundException(`Service with id ${id} not found`);
    return service;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<SalonService> {
    const service = await this.findOne(id);
    Object.assign(service, dto);
    return this.serviceRepo.save(service);
  }

  async remove(id: string): Promise<void> {
    const service = await this.findOne(id);
    await this.serviceRepo.remove(service);
  }
}