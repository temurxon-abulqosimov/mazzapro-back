import { DeviceToken } from '../entities/device-token.entity';

export interface IDeviceTokenRepository {
  findByUserId(userId: string): Promise<DeviceToken[]>;
  findActiveByUserId(userId: string): Promise<DeviceToken[]>;
  findByToken(token: string): Promise<DeviceToken | null>;
  save(deviceToken: DeviceToken): Promise<DeviceToken>;
  deactivateToken(token: string): Promise<void>;
  deactivateAllForUser(userId: string): Promise<void>;
}

export const DEVICE_TOKEN_REPOSITORY = Symbol('IDeviceTokenRepository');
