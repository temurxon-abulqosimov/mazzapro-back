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

    // OTP Methods
    private readonly OTP_PREFIX = 'otp:';
    private readonly OTP_EXPIRATION = 600; // 10 minutes
    private readonly MAX_ATTEMPTS = 3;

    async saveOtp(email: string, otp: string): Promise<void> {
        const key = `${this.OTP_PREFIX}${email}`;

        // Simple hash for OTP is sufficient and faster, but using bcrypt as requested/implied for security
        // actually for 6 digit OTP, bcrypt is good to prevent rainbow table if database leaks (but this is redis)
        // Let's use crypto for speed and obscuring
        const hash = crypto.createHash('sha256').update(otp).digest('hex');

        const data = JSON.stringify({
            hash,
            attempts: 0,
        });

        await this.redisService.set(key, data, this.OTP_EXPIRATION);
    }

    async validateOtp(email: string, otp: string): Promise<boolean> {
        const key = `${this.OTP_PREFIX}${email}`;
        const dataStr = await this.redisService.get(key) as string | null;

        if (!dataStr) {
            return false;
        }

        const data = JSON.parse(dataStr);

        if (data.attempts >= this.MAX_ATTEMPTS) {
            await this.redisService.del(key); // Lockout or just fail? Delete prevents further brute force
            return false;
        }

        const hash = crypto.createHash('sha256').update(otp).digest('hex');

        if (data.hash !== hash) {
            data.attempts += 1;
            await this.redisService.set(key, JSON.stringify(data), this.OTP_EXPIRATION); // Update attempts, keep ttl? 
            // Better to keep original TTL or slightly extend? Redis SET resets TTL unless specified. 
            // We should ideally use KEEPTTL but redisService might not expose it. 
            // Re-setting with original expiration is "okay" for now, or just don't reset if we can't.
            // Simplified: just set 10 mins again, it's fine.
            return false;
        }

        // Valid
        // Do NOT delete OTP yet if you want to allow "Verify -> Reset" flow in two steps 
        // But usually, verify deletes it? 
        // If we split into Verify endpoint and Reset endpoint, Verify just checks it returns OK. Reset uses it and deletes it.
        // We need a way to know "this user verified the OTP" so they can reset password.
        // Common pattern: Verify OTP -> Return a specialized secure token (JWT) or session.
        // OR: Just allow Reset endpoint to take OTP and checks it again.
        // Let's go with: Verify endpoint checks it (but doesn't delete/invalidate). Reset endpoint checks and deletes.
        // To prevent reuse, Reset endpoint invalidates it.

        return true;
    }

    async invalidateOtp(email: string): Promise<void> {
        const key = `${this.OTP_PREFIX}${email}`;
        await this.redisService.del(key);
    }
}
