import { Injectable, Inject } from '@nestjs/common';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import { JwtTokenService } from '../../infrastructure/services/jwt-token.service';
import { InvalidTokenException } from '@common/exceptions';

export interface RefreshResult {
  accessToken: string;
  expiresIn: number;
}

@Injectable()
export class RefreshTokensUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async execute(refreshTokenStr: string): Promise<RefreshResult> {
    // Verify refresh token
    const payload =
      await this.jwtTokenService.verifyRefreshToken(refreshTokenStr);
    if (!payload) {
      throw new InvalidTokenException();
    }

    // Find stored refresh token
    const tokenHash = this.jwtTokenService.hashToken(refreshTokenStr);
    const storedToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!storedToken || !storedToken.isValid()) {
      throw new InvalidTokenException();
    }

    // Get user
    const user = await this.userRepository.findById(storedToken.userId);
    if (!user || !user.isActive) {
      throw new InvalidTokenException();
    }

    // Update token last used
    storedToken.markUsed();
    await this.refreshTokenRepository.save(storedToken);

    // Generate new access token
    const accessToken = await this.jwtTokenService.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      marketId: user.marketId,
    });

    return {
      accessToken,
      expiresIn: 900, // 15 minutes
    };
  }
}
