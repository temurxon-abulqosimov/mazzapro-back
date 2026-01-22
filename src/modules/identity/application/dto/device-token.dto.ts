import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DevicePlatform } from '../../domain/entities/device-token.entity';

export class RegisterDeviceTokenDto {
  @ApiProperty({ example: 'fcm_token_string' })
  @IsString()
  token: string;

  @ApiProperty({ enum: DevicePlatform, example: DevicePlatform.IOS })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;
}
