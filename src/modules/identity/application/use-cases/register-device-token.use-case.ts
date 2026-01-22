import { Injectable, Inject } from '@nestjs/common';
import { DeviceToken } from '../../domain/entities/device-token.entity';
import {
  IDeviceTokenRepository,
  DEVICE_TOKEN_REPOSITORY,
} from '../../domain/repositories/device-token.repository.interface';
import { RegisterDeviceTokenDto } from '../dto/device-token.dto';

@Injectable()
export class RegisterDeviceTokenUseCase {
  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepository: IDeviceTokenRepository,
  ) {}

  async execute(userId: string, dto: RegisterDeviceTokenDto): Promise<string> {
    // Check if token already exists
    const existing = await this.deviceTokenRepository.findByToken(dto.token);

    if (existing) {
      // If same user, just activate it
      if (existing.userId === userId) {
        existing.activate();
        await this.deviceTokenRepository.save(existing);
        return existing.id;
      } else {
        // If different user, deactivate old and create new
        await this.deviceTokenRepository.deactivateToken(dto.token);
      }
    }

    // Create new device token
    const deviceToken = new DeviceToken();
    deviceToken.userId = userId;
    deviceToken.token = dto.token;
    deviceToken.platform = dto.platform;

    const saved = await this.deviceTokenRepository.save(deviceToken);
    return saved.id;
  }
}
