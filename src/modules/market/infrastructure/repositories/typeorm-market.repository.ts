import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Market } from '../../domain/entities/market.entity';
import { IMarketRepository } from '../../domain/repositories/market.repository.interface';

@Injectable()
export class TypeOrmMarketRepository implements IMarketRepository {
  constructor(
    @InjectRepository(Market)
    private readonly repository: Repository<Market>,
  ) {}

  async findById(id: string): Promise<Market | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Market | null> {
    return this.repository.findOne({ where: { slug } });
  }

  async findAll(): Promise<Market[]> {
    return this.repository.find({ order: { name: 'ASC' } });
  }

  async findActive(): Promise<Market[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async save(market: Market): Promise<Market> {
    return this.repository.save(market);
  }
}
