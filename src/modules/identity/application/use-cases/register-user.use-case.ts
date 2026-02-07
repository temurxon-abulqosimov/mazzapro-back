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
import { PasswordService } from '../../infrastructure/services/password.service';
import {
  JwtTokenService,
  TokenPair,
} from '../../infrastructure/services/jwt-token.service';
import { RegisterDto } from '../dto/register.dto';
import { EmailAlreadyExistsException } from '@common/exceptions';
import { UserRole } from '@common/types';

interface RegisterResult {
  user: User;
  tokens: TokenPair;
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtTokenService: JwtTokenService,
  ) { }

  async execute(dto: RegisterDto): Promise<RegisterResult> {
    // Check if email already exists
    const emailExists = await this.userRepository.existsByEmail(dto.email);
    if (emailExists) {
      throw new EmailAlreadyExistsException(dto.email);
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(dto.password);

    // Create user entity
    const user = new User();
    user.email = dto.email.toLowerCase();
    user.passwordHash = passwordHash;
    user.fullName = dto.fullName;
    user.marketId = dto.marketId;
    user.role = UserRole.CONSUMER;
    if (dto.lat !== undefined) user.lat = dto.lat;
    if (dto.lng !== undefined) user.lng = dto.lng;

    // Save user
    const savedUser = await this.userRepository.save(user);

    // Generate token pair
    const tokens = await this.jwtTokenService.generateTokenPair({
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      marketId: savedUser.marketId,
    });

    // Store refresh token
    const refreshToken = new RefreshToken();
    refreshToken.userId = savedUser.id;
    refreshToken.tokenHash = this.jwtTokenService.hashToken(tokens.refreshToken);
    refreshToken.expiresAt = this.jwtTokenService.getRefreshTokenExpiration();

    await this.refreshTokenRepository.save(refreshToken);

    return {
      user: savedUser,
      tokens,
    };
  }
}
