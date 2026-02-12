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
import { TokenService } from '../../infrastructure/services/token.service';
import { SmsService } from '@modules/notification/infrastructure/services/sms.service';
import { RegisterDto } from '../dto/register.dto';
import { PhoneAlreadyExistsException } from '@common/exceptions';
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
    private readonly tokenService: TokenService,
    private readonly smsService: SmsService,
  ) { }

  async execute(dto: RegisterDto): Promise<RegisterResult> {
    // Check if phone number already exists
    const phoneExists = await this.userRepository.existsByPhoneNumber(dto.phoneNumber);
    if (phoneExists) {
      throw new PhoneAlreadyExistsException(dto.phoneNumber);
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(dto.password);

    // Create user entity
    const user = new User();
    user.phoneNumber = dto.phoneNumber;
    user.email = null;
    user.passwordHash = passwordHash;
    user.fullName = dto.fullName;
    user.marketId = dto.marketId;
    user.role = UserRole.CONSUMER;
    user.authProvider = 'phone';
    if (dto.lat !== undefined) user.lat = dto.lat;
    if (dto.lng !== undefined) user.lng = dto.lng;

    // Save user
    const savedUser = await this.userRepository.save(user);

    // Generate token pair
    const tokens = await this.jwtTokenService.generateTokenPair({
      id: savedUser.id,
      email: savedUser.phoneNumber || '',
      role: savedUser.role,
      marketId: savedUser.marketId,
    });

    // Store refresh token
    const refreshToken = new RefreshToken();
    refreshToken.userId = savedUser.id;
    refreshToken.tokenHash = this.jwtTokenService.hashToken(tokens.refreshToken);
    refreshToken.expiresAt = this.jwtTokenService.getRefreshTokenExpiration();

    await this.refreshTokenRepository.save(refreshToken);

    // Send verification SMS
    await this.sendVerificationSms(savedUser.id, savedUser.phoneNumber!);

    return {
      user: savedUser,
      tokens,
    };
  }

  private async sendVerificationSms(userId: string, phoneNumber: string): Promise<void> {
    const code = await this.tokenService.createVerificationToken(userId);
    await this.smsService.sendVerificationCode(phoneNumber, code);
  }
}
