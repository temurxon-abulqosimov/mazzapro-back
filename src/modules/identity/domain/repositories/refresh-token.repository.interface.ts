import { RefreshToken } from '../entities/refresh-token.entity';

export interface IRefreshTokenRepository {
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  findActiveByUserId(userId: string): Promise<RefreshToken[]>;
  save(token: RefreshToken): Promise<RefreshToken>;
  revokeAllForUser(userId: string): Promise<void>;
  revokeToken(id: string): Promise<void>;
  deleteExpired(): Promise<number>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('IRefreshTokenRepository');
