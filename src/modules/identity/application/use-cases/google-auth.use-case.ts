import { Injectable, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { User } from '../../domain/entities/user.entity';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import {
  JwtTokenService,
  TokenPair,
} from '../../infrastructure/services/jwt-token.service';
import { GoogleAuthDto } from '../dto/google-auth.dto';
import { UserRole } from '@common/types';

interface GoogleAuthResult {
  user: User;
  tokens: TokenPair;
  isNewUser: boolean;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

const DEFAULT_MARKET_ID = '550e8400-e29b-41d4-a716-446655440000';

@Injectable()
export class GoogleAuthUseCase {
  private readonly logger = new Logger(GoogleAuthUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async execute(dto: GoogleAuthDto): Promise<GoogleAuthResult> {
    let googleId: string;
    let email: string;
    let fullName: string;
    let avatarUrl: string | null;

    // Try to verify as Firebase ID token first, then fall back to Google access token
    const tokenInfo = await this.verifyToken(dto.idToken);
    googleId = tokenInfo.id;
    email = tokenInfo.email.toLowerCase();
    fullName = tokenInfo.name || email.split('@')[0] || 'User';
    avatarUrl = tokenInfo.picture || null;

    // Try to find user by Google ID first
    let user = await this.userRepository.findByGoogleId(googleId);
    let isNewUser = false;

    if (!user) {
      // Check if user exists with this email (existing email/password user)
      user = await this.userRepository.findByEmail(email);

      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        user.authProvider = 'google';
        if (!user.avatarUrl && avatarUrl) {
          user.avatarUrl = avatarUrl;
        }
        user.emailVerified = true;
        user = await this.userRepository.save(user);
      } else {
        // Create new user
        user = new User();
        user.email = email;
        user.googleId = googleId;
        user.authProvider = 'google';
        user.fullName = fullName;
        user.avatarUrl = avatarUrl;
        user.passwordHash = null;
        user.marketId = dto.marketId || DEFAULT_MARKET_ID;
        user.role = UserRole.CONSUMER;
        user.emailVerified = true;

        user = await this.userRepository.save(user);
        isNewUser = true;
      }
    }

    // Update last login
    user.recordLogin();
    await this.userRepository.save(user);

    // Generate token pair
    const tokens = await this.jwtTokenService.generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
      marketId: user.marketId,
    });

    // Store refresh token
    const refreshToken = new RefreshToken();
    refreshToken.userId = user.id;
    refreshToken.tokenHash = this.jwtTokenService.hashToken(tokens.refreshToken);
    refreshToken.expiresAt = this.jwtTokenService.getRefreshTokenExpiration();

    await this.refreshTokenRepository.save(refreshToken);

    return {
      user,
      tokens,
      isNewUser,
    };
  }

  private async verifyToken(token: string): Promise<GoogleUserInfo> {
    // First try Firebase ID token verification
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      if (!decodedToken.email) {
        throw new UnauthorizedException('Google account must have an email');
      }
      return {
        id: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
      };
    } catch (firebaseError) {
      this.logger.debug(`Firebase token verification failed, trying Google access token: ${firebaseError.message}`);
    }

    // Fall back to Google access token verification
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Google API returned ${response.status}`);
      }

      const userInfo = await response.json();

      if (!userInfo.email) {
        throw new UnauthorizedException('Google account must have an email');
      }

      return {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      };
    } catch (googleError) {
      this.logger.error(`Failed to verify Google token: ${googleError.message}`);
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
