import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { IReviewRepository } from '../../domain/repositories/review.repository.interface';
import { Review } from '../../domain/entities/review.entity';

@Injectable()
export class TypeOrmReviewRepository implements IReviewRepository {
    private readonly repository: Repository<Review>;

    constructor(private readonly dataSource: DataSource) {
        this.repository = this.dataSource.getRepository(Review);
    }

    async save(review: Review): Promise<Review> {
        return this.repository.save(review);
    }

    async findByBookingId(bookingId: string): Promise<Review | null> {
        return this.repository.findOne({ where: { bookingId } });
    }

    async findByStoreId(storeId: string, page: number, limit: number): Promise<Review[]> {
        return this.repository.find({
            where: { storeId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
            relations: ['reviewer'], // Include reviewer details
        });
    }

    async countByStoreId(storeId: string): Promise<number> {
        return this.repository.count({ where: { storeId } });
    }

    async getAverageRating(storeId: string): Promise<number> {
        const { average } = await this.repository
            .createQueryBuilder('review')
            .select('AVG(review.rating)', 'average')
            .where('review.store_id = :storeId', { storeId })
            .getRawOne();

        return parseFloat(average) || 0;
    }
}
