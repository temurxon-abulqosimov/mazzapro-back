import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories';
import { TokenService } from '../../infrastructure/services/token.service';
import { EmailService } from '@modules/notification/infrastructure/services/email.service';

@Injectable()
export class ForgotPasswordUseCase {
    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
        private readonly tokenService: TokenService,
        private readonly emailService: EmailService,
    ) { }

    async execute(email: string): Promise<void> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            // As per requirements: return error if email not found
            throw new NotFoundException('User with this email does not exist');
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await this.tokenService.saveOtp(user.email, otp);
        await this.emailService.sendForgotPasswordEmail(user.email, otp);
    }
}
