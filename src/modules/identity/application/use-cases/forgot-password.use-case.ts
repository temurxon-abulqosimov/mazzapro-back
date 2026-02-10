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
            // Don't reveal if user exists
            return;
        }

        const token = await this.tokenService.createPasswordResetToken(user.id);
        await this.emailService.sendForgotPasswordEmail(user.email, token);
    }
}
