import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../../domain/entities/favorite.entity';
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
      relations: ['store'],
    });
  }

  async findByUserAndStore(userId: string, storeId: string): Promise<Favorite | null> {
    return this.repository.findOne({
      where: { userId, storeId },
    });
  }

  async findByUserId(userId: string, limit = 20, cursor?: string): Promise<Favorite[]> {
    const qb = this.repository
      .createQueryBuilder('favorite')
      .leftJoinAndSelect('favorite.store', 'store')
      .where('favorite.user_id = :userId', { userId })
      .orderBy('favorite.createdAt', 'DESC');

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

  async countByUserId(userId: string): Promise<number> {
    return this.repository.count({ where: { userId } });
  }

  async getStoreIdsByUserId(userId: string): Promise<string[]> {
    const favorites = await this.repository.find({
      where: { userId },
      select: ['storeId'],
    });
    return favorites.map((f) => f.storeId);
  }

  async save(favorite: Favorite): Promise<Favorite> {
    return this.repository.save(favorite);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByUserAndStore(userId: string, storeId: string): Promise<boolean> {
    const result = await this.repository.delete({ userId, storeId });
    return (result.affected || 0) > 0;
  }
}
