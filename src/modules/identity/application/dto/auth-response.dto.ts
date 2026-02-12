import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@common/types';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  phoneNumber: string | null;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  marketId: string;

  @ApiProperty()
  createdAt: Date;
}

export class TokensResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ description: 'Access token expiration in seconds' })
  expiresIn: number;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ type: TokensResponseDto })
  tokens: TokensResponseDto;
}

export class UserProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  phoneNumber: string | null;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  level: {
    name: string;
    progress: number;
  };

  @ApiProperty()
  stats: {
    mealsSaved: number;
    co2Prevented: number;
    moneySaved: number;
  };

  @ApiProperty()
  memberSince: Date;

  @ApiProperty()
  market: {
    id: string;
    name: string;
  };
}
