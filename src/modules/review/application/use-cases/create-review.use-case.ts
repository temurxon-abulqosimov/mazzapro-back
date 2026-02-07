import { Injectable, Inject, Logger } from '@nestjs/common';
import { CreateReviewDto } from '../dto/create-review.dto';
import { Review } from '../../domain/entities/review.entity';
import {
    IReviewRepository,
    REVIEW_REPOSITORY,
} from '../../domain/repositories/review.repository.interface';
import {
    IBookingRepository,
    BOOKING_REPOSITORY,
} from '@modules/booking/domain/repositories/booking.repository.interface';
import {
    IStoreRepository,
    STORE_REPOSITORY,
} from '@modules/store/domain/repositories/store.repository.interface';
import {
    EntityNotFoundException,
    UnauthorizedAccessException,
    DomainException,
} from '@common/exceptions';
import { BookingStatus } from '@modules/booking/domain/entities/booking.entity';

@Injectable()
export class CreateReviewUseCase {
    private readonly logger = new Logger(CreateReviewUseCase.name);

    constructor(
        @Inject(REVIEW_REPOSITORY)
        private readonly reviewRepository: IReviewRepository,
        @Inject(BOOKING_REPOSITORY)
        private readonly bookingRepository: IBookingRepository,
        @Inject(STORE_REPOSITORY)
        private readonly storeRepository: IStoreRepository,
    ) { }

    async execute(userId: string, dto: CreateReviewDto): Promise<Review> {
        // 1. Fetch Booking
        const booking = await this.bookingRepository.findById(dto.bookingId);
        if (!booking) {
            throw new EntityNotFoundException('Booking', dto.bookingId);
        }

        // 2. Validate Ownership
        if (booking.userId !== userId) {
            throw new UnauthorizedAccessException('Booking');
        }

        // 3. Validate Status
        if (booking.status !== BookingStatus.COMPLETED) {
            throw new DomainException(
                'INVALID_REVIEW_STATE',
                'Only completed bookings can be reviewed',
            );
        }

        // 4. Check for existing review
        const existingReview = await this.reviewRepository.findByBookingId(dto.bookingId);
        if (existingReview) {
            throw new DomainException(
                'REVIEW_ALREADY_EXISTS',
                'You have already reviewed this booking',
            );
        }

        // 5. Create Review
        const review = new Review();
        review.rating = dto.rating;
        review.comment = dto.comment || '';
        review.bookingId = booking.id;
        review.reviewerId = userId;
        review.storeId = booking.storeId;
        review.productId = booking.productId;

        const savedReview = await this.reviewRepository.save(review);

        // 6. Update Store Rating
        await this.updateStoreRating(booking.storeId);

        return savedReview;
    }

    private async updateStoreRating(storeId: string): Promise<void> {
        const average = await this.reviewRepository.getAverageRating(storeId);
        const count = await this.reviewRepository.countByStoreId(storeId);

        // Assuming store entity has updateRating method or public props
        // We will verify Store entity structure in the next step, but logically we need to update it.
        const store = await this.storeRepository.findById(storeId);
        if (store) {
            store.rating = Number(average.toFixed(1));
            store.reviewCount = count;
            await this.storeRepository.save(store);
        }
    }
}
