import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AuthenticatedUser, UserRole } from '@common/types';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  marketId: string;
  sellerId?: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class JwtTokenService {
  private readonly accessExpiration: string;
  private readonly refreshExpiration: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessExpiration = this.configService.get<string>(
      'auth.jwtAccessExpiration',
      '15m',
    );
    this.refreshExpiration = this.configService.get<string>(
      'auth.jwtRefreshExpiration',
      '7d',
    );
    this.refreshSecret = this.configService.get<string>(
      'auth.jwtRefreshSecret',
      '',
    );
  }

  async generateTokenPair(user: AuthenticatedUser): Promise<TokenPair> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      marketId: user.marketId,
      sellerId: user.sellerId,
    };

    const jti = crypto.randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      jti,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      expiresIn: this.accessExpiration,
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiration,
    });

    const expiresIn = this.parseExpirationToSeconds(this.accessExpiration);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  async generateAccessToken(user: AuthenticatedUser): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      marketId: user.marketId,
      sellerId: user.sellerId,
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: this.accessExpiration,
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
      return await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      return null;
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshSecret,
      });
    } catch {
      return null;
    }
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  getRefreshTokenExpiration(): Date {
    const seconds = this.parseExpirationToSeconds(this.refreshExpiration);
    return new Date(Date.now() + seconds * 1000);
  }

  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
