import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '998901234567', description: 'Phone number in format 998XXXXXXXXX' })
  @IsString()
  @Matches(/^998\d{9}$/, {
    message: 'Phone number must be in format 998XXXXXXXXX (12 digits)',
  })
  phoneNumber: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(1)
  password: string;
}
