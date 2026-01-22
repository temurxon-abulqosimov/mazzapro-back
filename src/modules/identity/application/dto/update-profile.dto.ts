import { IsString, MinLength, MaxLength, IsOptional, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alex J.' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.mazza.app/avatars/xxx.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
