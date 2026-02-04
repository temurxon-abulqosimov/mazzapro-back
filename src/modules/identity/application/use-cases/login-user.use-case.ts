import { Injectable, Inject } from '@nestjs/common';
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
  ISellerRepository,
  SELLER_REPOSITORY,
} from '@modules/store/domain/repositories/seller.repository.interface';
import {
  IStoreRepository,
  STORE_REPOSITORY,
} from '@modules/store/domain/repositories/store.repository.interface';
import { PasswordService } from '../../infrastructure/services/password.service';
import {
  JwtTokenService,
  TokenPair,
} from '../../infrastructure/services/jwt-token.service';
import { LoginDto } from '../dto/login.dto';
import { InvalidCredentialsException } from '@common/exceptions';
import { UserRole } from '@common/types';

interface LoginResult {
  user: User;
  tokens: TokenPair;
}

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(SELLER_REPOSITORY)
    private readonly sellerRepository: ISellerRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtTokenService: JwtTokenService,
  ) { }

  async execute(dto: LoginDto): Promise<LoginResult> {
    // Find user by email
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    // Verify password
    const isValid = await this.passwordService.verify(
      dto.password,
      user.passwordHash,
    );
    if (!isValid) {
      throw new InvalidCredentialsException();
    }

    // Check if user is active
    if (!user.isActive) {
      throw new InvalidCredentialsException();
    }

    // Update last login
    user.recordLogin();
    await this.userRepository.save(user);

    let storeId: string | undefined;

    if (user.role === UserRole.SELLER) {
      const seller = await this.sellerRepository.findByUserId(user.id);
      if (seller) {
        const store = await this.storeRepository.findBySellerId(seller.id);
        if (store) {
          storeId = store.id;
        }
      }
    }

    // Generate token pair
    const tokens = await this.jwtTokenService.generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
      marketId: user.marketId,
      sellerId: storeId,
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
    };
  }
}
