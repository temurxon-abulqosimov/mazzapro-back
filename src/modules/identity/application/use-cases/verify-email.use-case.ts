import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { TokenService } from '../../infrastructure/services/token.service';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories';

@Injectable()
export class VerifyEmailUseCase {
    constructor(
        private readonly tokenService: TokenService,
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
    ) { }

    async execute(phoneNumber: string, token: string): Promise<void> {
        const userId = await this.tokenService.validateVerificationToken(token);

        if (!userId) {
            throw new NotFoundException('Invalid or expired verification code');
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify that the phone number matches
        if (user.phoneNumber !== phoneNumber) {
            throw new NotFoundException('Invalid verification code');
        }

        if (user.phoneVerified) {
            return; // Already verified
        }

        user.phoneVerified = true;
        await this.userRepository.save(user);
    }
}
