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

    async execute(token: string, newPassword: string): Promise<void> {
        const userId = await this.tokenService.validatePasswordResetToken(token);

        if (!userId) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        user.passwordHash = await this.passwordService.hash(newPassword);
        await this.userRepository.save(user);
    }
}
