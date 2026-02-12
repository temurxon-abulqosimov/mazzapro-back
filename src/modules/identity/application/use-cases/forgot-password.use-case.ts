import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories';
import { TokenService } from '../../infrastructure/services/token.service';
import { SmsService } from '@modules/notification/infrastructure/services/sms.service';

@Injectable()
export class ForgotPasswordUseCase {
    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
        private readonly tokenService: TokenService,
        private readonly smsService: SmsService,
    ) { }

    async execute(phoneNumber: string): Promise<void> {
        const user = await this.userRepository.findByPhoneNumber(phoneNumber);
        if (!user) {
            throw new NotFoundException('User with this phone number does not exist');
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await this.tokenService.saveOtp(user.phoneNumber!, otp);
        await this.smsService.sendPasswordResetCode(user.phoneNumber!, otp);
    }
}
