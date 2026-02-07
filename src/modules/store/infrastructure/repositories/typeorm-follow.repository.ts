import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from '../../domain/entities/follow.entity';
import { IFollowRepository } from '../../domain/repositories/follow.repository.interface';

@Injectable()
export class TypeOrmFollowRepository implements IFollowRepository {
    constructor(
        @InjectRepository(Follow)
        private readonly repository: Repository<Follow>,
    ) { }

    async create(userId: string, storeId: string): Promise<Follow> {
        const follow = this.repository.create({ userId, storeId });
        return this.repository.save(follow);
    }

    async delete(userId: string, storeId: string): Promise<void> {
        await this.repository.delete({ userId, storeId });
    }

    async exists(userId: string, storeId: string): Promise<boolean> {
        const count = await this.repository.count({ where: { userId, storeId } });
        return count > 0;
    }

    async findByUserId(userId: string): Promise<Follow[]> {
        return this.repository.find({
            where: { userId },
            relations: ['store'],
            order: { createdAt: 'DESC' },
        });
    }

    async findByStoreId(storeId: string): Promise<Follow[]> {
        return this.repository.find({
            where: { storeId },
            relations: ['user'],
        });
    }

    async countByStoreId(storeId: string): Promise<number> {
        return this.repository.count({ where: { storeId } });
    }
}
