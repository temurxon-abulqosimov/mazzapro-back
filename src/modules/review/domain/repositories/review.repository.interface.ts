import { Review } from '../entities/review.entity';

export const REVIEW_REPOSITORY = 'REVIEW_REPOSITORY';

export interface IReviewRepository {
    save(review: Review): Promise<Review>;
    findByBookingId(bookingId: string): Promise<Review | null>;
    findByStoreId(storeId: string, page: number, limit: number): Promise<Review[]>;
    countByStoreId(storeId: string): Promise<number>;
    getAverageRating(storeId: string): Promise<number>;
}
