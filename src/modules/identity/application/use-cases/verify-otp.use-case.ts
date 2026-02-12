import { Injectable, BadRequestException } from '@nestjs/common';
import { TokenService } from '../../infrastructure/services/token.service';

@Injectable()
export class VerifyOtpUseCase {
    constructor(private readonly tokenService: TokenService) { }

    async execute(phoneNumber: string, otp: string): Promise<boolean> {
        const isValid = await this.tokenService.validateOtp(phoneNumber, otp);

        if (!isValid) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        return true;
    }
}
