import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories';
import { TokenService } from '../../infrastructure/services/token.service';
import { PasswordService } from '../../infrastructure/services/password.service';

@Injectable()
export class ResetPasswordUseCase {
    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
        private readonly tokenService: TokenService,
        private readonly passwordService: PasswordService,
    ) { }

    async execute(phoneNumber: string, otp: string, newPassword: string): Promise<void> {
        const isValid = await this.tokenService.validateOtp(phoneNumber, otp);

        if (!isValid) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        const user = await this.userRepository.findByPhoneNumber(phoneNumber);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        user.passwordHash = await this.passwordService.hash(newPassword);
        await this.userRepository.save(user);

        // Invalidate OTP after successful reset
        await this.tokenService.invalidateOtp(phoneNumber);
    }
}
