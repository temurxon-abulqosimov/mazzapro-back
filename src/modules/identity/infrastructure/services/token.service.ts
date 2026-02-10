import { Injectable } from '@nestjs/common';
import { RedisService } from '@common/redis/redis.service';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
    private readonly VERIFICATION_PREFIX = 'verification_token:';
    private readonly RESET_PASSWORD_PREFIX = 'reset_token:';
    private readonly TOKEN_EXPIRATION = 900; // 15 minutes in seconds

    constructor(private readonly redisService: RedisService) { }

    private generateToken(): string {
        return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    }

    async createVerificationToken(userId: string): Promise<string> {
        const token = this.generateToken();
        const key = `${this.VERIFICATION_PREFIX}${token}`;

        // Store token -> userId mapping
        await this.redisService.set(key, userId, this.TOKEN_EXPIRATION);
        return token;
    }

    async validateVerificationToken(token: string): Promise<string | null> {
        const key = `${this.VERIFICATION_PREFIX}${token}`;
        const userId = await this.redisService.get(key) as string | null;

        if (userId) {
            await this.redisService.del(key); // Invalidate token after use
        }

        return userId;
    }

    async createPasswordResetToken(userId: string): Promise<string> {
        const token = this.generateToken();
        const key = `${this.RESET_PASSWORD_PREFIX}${token}`;

        await this.redisService.set(key, userId, this.TOKEN_EXPIRATION);
        return token;
    }

    async validatePasswordResetToken(token: string): Promise<string | null> {
        const key = `${this.RESET_PASSWORD_PREFIX}${token}`;
        const userId = await this.redisService.get(key) as string | null;

        if (userId) {
            await this.redisService.del(key);
        }

        return userId;
    }
}
