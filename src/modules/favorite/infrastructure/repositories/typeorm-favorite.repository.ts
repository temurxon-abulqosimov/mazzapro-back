import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite, FavoriteType } from '../../domain/entities/favorite.entity';
import { IFavoriteRepository } from '../../domain/repositories';
import { decodeCursor } from '@common/utils/pagination.util';

@Injectable()
export class TypeOrmFavoriteRepository implements IFavoriteRepository {
  constructor(
    @InjectRepository(Favorite)
    private readonly repository: Repository<Favorite>,
  ) {}

  async findById(id: string): Promise<Favorite | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['store', 'product', 'product.images'],
    });
  }

  async findByUserAndStore(userId: string, storeId: string): Promise<Favorite | null> {
    return this.repository.findOne({
      where: { userId, storeId, type: FavoriteType.STORE },
    });
  }

  async findByUserAndProduct(userId: string, productId: string): Promise<Favorite | null> {
    return this.repository.findOne({
      where: { userId, productId, type: FavoriteType.PRODUCT },
    });
  }

  async findByUserId(userId: string, type?: FavoriteType, limit = 20, cursor?: string): Promise<Favorite[]> {
    const qb = this.repository
      .createQueryBuilder('favorite')
      .leftJoinAndSelect('favorite.store', 'store')
      .leftJoinAndSelect('favorite.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .where('favorite.user_id = :userId', { userId });

    if (type) {
      qb.andWhere('favorite.type = :type', { type });
    }

    qb.orderBy('favorite.createdAt', 'DESC');

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded?.lastId) {
        const cursorFavorite = await this.repository.findOne({
          where: { id: decoded.lastId },
          select: ['createdAt'],
        });
        if (cursorFavorite) {
          qb.andWhere('favorite.createdAt < :cursorDate', {
            cursorDate: cursorFavorite.createdAt,
          });
        }
      }
    }

    return qb.take(limit).getMany();
  }

  async countByUserId(userId: string, type?: FavoriteType): Promise<number> {
    const where: any = { userId };
    if (type) {
      where.type = type;
    }
    return this.repository.count({ where });
  }

  async getStoreIdsByUserId(userId: string): Promise<string[]> {
    const favorites = await this.repository.find({
      where: { userId, type: FavoriteType.STORE },
      select: ['storeId'],
    });
    return favorites.map((f) => f.storeId).filter((id): id is string => id !== null);
  }

  async getProductIdsByUserId(userId: string): Promise<string[]> {
    const favorites = await this.repository.find({
      where: { userId, type: FavoriteType.PRODUCT },
      select: ['productId'],
    });
    return favorites.map((f) => f.productId).filter((id): id is string => id !== null);
  }

  async save(favorite: Favorite): Promise<Favorite> {
    return this.repository.save(favorite);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByUserAndStore(userId: string, storeId: string): Promise<boolean> {
    const result = await this.repository.delete({
      userId,
      storeId,
      type: FavoriteType.STORE
    });
    return (result.affected || 0) > 0;
  }

  async deleteByUserAndProduct(userId: string, productId: string): Promise<boolean> {
    const result = await this.repository.delete({
      userId,
      productId,
      type: FavoriteType.PRODUCT
    });
    return (result.affected || 0) > 0;
  }
}
