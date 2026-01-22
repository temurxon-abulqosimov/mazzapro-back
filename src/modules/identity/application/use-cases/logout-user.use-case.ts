import { Injectable, Inject } from '@nestjs/common';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import { JwtTokenService } from '../../infrastructure/services/jwt-token.service';

@Injectable()
export class LogoutUserUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async execute(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke specific token
      const tokenHash = this.jwtTokenService.hashToken(refreshToken);
      const storedToken =
        await this.refreshTokenRepository.findByTokenHash(tokenHash);
      if (storedToken) {
        await this.refreshTokenRepository.revokeToken(storedToken.id);
      }
    } else {
      // Revoke all tokens for user
      await this.refreshTokenRepository.revokeAllForUser(userId);
    }
  }
}
