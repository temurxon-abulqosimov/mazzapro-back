import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../domain/entities/category.entity';
import { ICategoryRepository } from '../../domain/repositories/category.repository.interface';

@Injectable()
export class TypeOrmCategoryRepository implements ICategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
  ) {}

  async findById(id: string): Promise<Category | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.repository.findOne({ where: { slug } });
  }

  async findAll(): Promise<Category[]> {
    return this.repository.find({ order: { displayOrder: 'ASC', name: 'ASC' } });
  }

  async findActive(): Promise<Category[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async save(category: Category): Promise<Category> {
    return this.repository.save(category);
  }
}
