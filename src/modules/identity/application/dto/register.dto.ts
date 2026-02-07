import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsUUID,
  Matches,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one lowercase letter, one uppercase letter, and one number',
  })
  password: string;

  @ApiProperty({ example: 'Alex Johnson' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  marketId: string;

  @ApiPropertyOptional({ example: 40.7128 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ example: -74.0060 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}
