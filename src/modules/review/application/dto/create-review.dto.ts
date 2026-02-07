import { IsString, IsNumber, IsUUID, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
    @ApiProperty({ description: 'The booking ID being reviewed' })
    @IsUUID()
    bookingId: string;

    @ApiProperty({ minimum: 1, maximum: 5, description: 'Rating from 1 to 5' })
    @IsNumber()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiPropertyOptional({ description: 'Optional text comment' })
    @IsOptional()
    @IsString()
    comment?: string;
}
