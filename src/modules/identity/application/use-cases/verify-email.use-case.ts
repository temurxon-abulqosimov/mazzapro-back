import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { TokenService } from '../../infrastructure/services/token.service';
import { EmailService } from '@modules/notification/infrastructure/services/email.service';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories';

@Injectable()
export class VerifyEmailUseCase {
    constructor(
        private readonly tokenService: TokenService,
        private readonly emailService: EmailService,
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
    ) { }

    async execute(token: string): Promise<void> {
        const userId = await this.tokenService.validateVerificationToken(token);

        if (!userId) {
            throw new NotFoundException('Invalid or expired verification token');
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.emailVerified) {
            return; // Already verified
        }

        user.emailVerified = true;
        await this.userRepository.save(user);

        await this.emailService.sendWelcomeEmail(user.email, user.fullName);
    }
}
