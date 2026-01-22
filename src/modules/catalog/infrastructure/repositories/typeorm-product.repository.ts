import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Product, ProductStatus } from '../../domain/entities/product.entity';
import {
  IProductRepository,
  ProductQueryOptions,
} from '../../domain/repositories/product.repository.interface';
import { decodeCursor } from '@common/utils/pagination.util';

@Injectable()
export class TypeOrmProductRepository implements IProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {}

  async findById(id: string): Promise<Product | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByIdWithRelations(id: string): Promise<Product | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['store', 'category', 'images'],
    });
  }

  async findByStoreId(
    storeId: string,
    options?: ProductQueryOptions,
  ): Promise<Product[]> {
    const query = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.store_id = :storeId', { storeId })
      .orderBy('product.created_at', 'DESC');

    if (options?.status) {
      query.andWhere('product.status = :status', { status: options.status });
    }

    if (options?.cursor) {
      const decoded = decodeCursor(options.cursor);
      if (decoded) {
        query.andWhere('product.id < :lastId', { lastId: decoded.lastId });
      }
    }

    if (options?.limit) {
      query.take(options.limit + 1);
    }

    return query.getMany();
  }

  async findActiveByStoreId(storeId: string): Promise<Product[]> {
    return this.repository.find({
      where: {
        storeId,
        status: In([ProductStatus.ACTIVE, ProductStatus.SOLD_OUT]),
      },
      relations: ['images', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findExpiredActive(): Promise<Product[]> {
    return this.repository.find({
      where: {
        status: In([ProductStatus.ACTIVE, ProductStatus.SOLD_OUT]),
        expiresAt: LessThan(new Date()),
      },
    });
  }

  async save(product: Product): Promise<Product> {
    return this.repository.save(product);
  }

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    await this.repository.update(id, updates);
    const product = await this.findById(id);
    if (!product) {
      throw new Error(`Product with id ${id} not found`);
    }
    return product;
  }

  async countByStoreId(storeId: string, status?: ProductStatus): Promise<number> {
    const where: Record<string, unknown> = { storeId };
    if (status) {
      where.status = status;
    }
    return this.repository.count({ where });
  }
}
