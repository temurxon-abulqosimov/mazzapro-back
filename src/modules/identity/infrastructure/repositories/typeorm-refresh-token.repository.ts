import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { IRefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.interface';

@Injectable()
export class TypeOrmRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repository: Repository<RefreshToken>,
  ) {}

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
  }

  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    return this.repository.find({
      where: {
        userId,
        isRevoked: false,
      },
    });
  }

  async save(token: RefreshToken): Promise<RefreshToken> {
    return this.repository.save(token);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async revokeToken(id: string): Promise<void> {
    await this.repository.update(id, { isRevoked: true });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }
}
