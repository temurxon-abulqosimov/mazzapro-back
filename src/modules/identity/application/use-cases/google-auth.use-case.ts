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
import { EmailService } from '@modules/notification/infrastructure/services/email.service';
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
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: GoogleAuthDto): Promise<GoogleAuthResult> {
    // Verify the token — tries Firebase ID token, then Google access token, then Google ID token (tokeninfo)
    const tokenInfo = await this.verifyToken(dto.idToken);
    const googleId = tokenInfo.id;
    const email = tokenInfo.email.toLowerCase();
    const fullName = tokenInfo.name || email.split('@')[0] || 'User';
    const avatarUrl = tokenInfo.picture || null;

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
        this.logger.log(`Linked Google account to existing user: ${email}`);
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
        this.logger.log(`Created new user via Google: ${email}`);

        // Send welcome email for new Google users (non-blocking)
        this.emailService.sendWelcomeEmail(email, fullName).catch(err => {
          this.logger.error(`Failed to send welcome email to ${email}`, err);
        });
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
    // Strategy 1: Try Firebase ID token verification
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      if (!decodedToken.email) {
        throw new UnauthorizedException('Google account must have an email');
      }
      this.logger.debug('Token verified via Firebase');
      return {
        id: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
      };
    } catch (firebaseError) {
      this.logger.debug(`Firebase verification skipped: ${firebaseError.message}`);
    }

    // Strategy 2: Try as Google OAuth access token (from expo-auth-session)
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const userInfo = await response.json();
        if (!userInfo.email) {
          throw new UnauthorizedException('Google account must have an email');
        }
        this.logger.debug('Token verified via Google userinfo (access token)');
        return {
          id: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        };
      }
      this.logger.debug(`Google userinfo returned ${response.status}, trying tokeninfo...`);
    } catch (accessTokenError) {
      this.logger.debug(`Access token verification failed: ${accessTokenError.message}`);
    }

    // Strategy 3: Try as Google ID token via tokeninfo endpoint
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
      );

      if (response.ok) {
        const tokenInfo = await response.json();
        if (!tokenInfo.email) {
          throw new UnauthorizedException('Google account must have an email');
        }
        this.logger.debug('Token verified via Google tokeninfo (ID token)');
        return {
          id: tokenInfo.sub,
          email: tokenInfo.email,
          name: tokenInfo.name,
          picture: tokenInfo.picture,
        };
      }
    } catch (idTokenError) {
      this.logger.debug(`ID token verification failed: ${idTokenError.message}`);
    }

    this.logger.error('All Google token verification strategies failed');
    throw new UnauthorizedException('Invalid Google token — could not verify with any strategy');
  }
}
