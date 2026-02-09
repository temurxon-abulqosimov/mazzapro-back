import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './domain/entities/review.entity';
import { ReviewController } from './presentation/controllers/review.controller';
import { CreateReviewUseCase } from './application/use-cases/create-review.use-case';
import { TypeOrmReviewRepository } from './infrastructure/repositories/typeorm-review.repository';
import { REVIEW_REPOSITORY } from './domain/repositories/review.repository.interface';
import { BookingModule } from '../booking/booking.module';
import { StoreModule } from '../store/store.module';
import { IdentityModule } from '../identity/identity.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Review]),
        forwardRef(() => BookingModule),
        StoreModule,
        IdentityModule,
        CatalogModule,
    ],
    controllers: [ReviewController],
    providers: [
        CreateReviewUseCase,
        {
            provide: REVIEW_REPOSITORY,
            useClass: TypeOrmReviewRepository,
        },
    ],
    exports: [REVIEW_REPOSITORY],
})
export class ReviewModule { }
