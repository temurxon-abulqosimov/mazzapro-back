import {
    Controller,
    Post,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
    Inject,
    Get,
    Param,
    Query,
    DefaultValuePipe,
    ParseIntPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/types';
import { CreateReviewDto } from '../../application/dto/create-review.dto';
import { CreateReviewUseCase } from '../../application/use-cases/create-review.use-case';
import {
    IReviewRepository,
    REVIEW_REPOSITORY,
} from '../../domain/repositories/review.repository.interface';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
    constructor(
        private readonly createReviewUseCase: CreateReviewUseCase,
        @Inject(REVIEW_REPOSITORY)
        private readonly reviewRepository: IReviewRepository,
    ) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new review for a completed booking' })
    @ApiResponse({ status: 201, description: 'Review created successfully' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
    @ApiResponse({ status: 403, description: 'Unauthorized review attempt' })
    @ApiResponse({ status: 409, description: 'Review already exists or booking not completed' })
    async createReview(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateReviewDto,
    ) {
        return this.createReviewUseCase.execute(user.id, dto);
    }

    @Get('store/:storeId')
    @ApiOperation({ summary: 'Get reviews for a store' })
    @ApiResponse({ status: 200, description: 'List of reviews' })
    async getStoreReviews(
        @Param('storeId') storeId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        limit = limit > 50 ? 50 : limit;

        // We access repository directly for simple queries, CQS pattern allows this for queries
        const reviews = await this.reviewRepository.findByStoreId(storeId, page, limit);
        const total = await this.reviewRepository.countByStoreId(storeId);

        return {
            data: reviews,
            meta: {
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                    hasMore: page < Math.ceil(total / limit),
                    cursor: null,
                }
            },
        };
    }
}
