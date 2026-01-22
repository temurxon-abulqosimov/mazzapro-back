import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceToken } from '../../domain/entities/device-token.entity';
import { IDeviceTokenRepository } from '../../domain/repositories/device-token.repository.interface';

@Injectable()
export class TypeOrmDeviceTokenRepository implements IDeviceTokenRepository {
  constructor(
    @InjectRepository(DeviceToken)
    private readonly repository: Repository<DeviceToken>,
  ) {}

  async findByUserId(userId: string): Promise<DeviceToken[]> {
    return this.repository.find({ where: { userId } });
  }

  async findActiveByUserId(userId: string): Promise<DeviceToken[]> {
    return this.repository.find({
      where: { userId, isActive: true },
    });
  }

  async findByToken(token: string): Promise<DeviceToken | null> {
    return this.repository.findOne({ where: { token } });
  }

  async save(deviceToken: DeviceToken): Promise<DeviceToken> {
    return this.repository.save(deviceToken);
  }

  async deactivateToken(token: string): Promise<void> {
    await this.repository.update({ token }, { isActive: false });
  }

  async deactivateAllForUser(userId: string): Promise<void> {
    await this.repository.update({ userId }, { isActive: false });
  }
}
