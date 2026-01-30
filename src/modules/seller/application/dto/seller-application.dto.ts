import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SellerApplicationDto {
  @ApiProperty({
    description: 'Business name',
    example: 'Green Market Grocery',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  businessName: string;

  @ApiProperty({
    description: 'Type of business (e.g., RESTAURANT, CAFE, GROCERY)',
    example: 'RESTAURANT',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  businessType: string;

  @ApiProperty({
    description: 'Short description of the business',
    example: 'Fresh organic produce and local goods',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  description: string;

  @ApiProperty({
    description: 'Business phone number',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  phoneNumber: string;
}
