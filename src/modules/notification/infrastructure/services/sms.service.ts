import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EskizAuthResponse {
  message: string;
  data: {
    token: string;
  };
  token_type: string;
}

interface EskizSmsResponse {
  id: string;
  status: string;
  message: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly baseUrl = 'https://notify.eskiz.uz/api';
  private readonly eskizEmail: string | undefined;
  private readonly eskizPassword: string | undefined;
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly configService: ConfigService) {
    this.eskizEmail = this.configService.get<string>('ESKIZ_EMAIL');
    this.eskizPassword = this.configService.get<string>('ESKIZ_PASSWORD');

    if (this.eskizEmail && this.eskizPassword) {
      this.logger.log('SMS service initialized with Eskiz.uz');
    } else {
      this.logger.warn(
        'ESKIZ_EMAIL or ESKIZ_PASSWORD not set. SMS service running in MOCK mode — messages will be logged to console.',
      );
    }
  }

  private async authenticate(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    if (!this.eskizEmail || !this.eskizPassword) {
      throw new Error('Eskiz credentials not configured');
    }

    try {
      const formData = new FormData();
      formData.append('email', this.eskizEmail);
      formData.append('password', this.eskizPassword);

      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Eskiz auth failed with status ${response.status}`);
      }

      const data = (await response.json()) as EskizAuthResponse;
      this.token = data.data.token;
      // Token is valid for 30 days; refresh 1 day early
      this.tokenExpiresAt = Date.now() + 29 * 24 * 60 * 60 * 1000;
      this.logger.log('Eskiz authentication successful');
      return this.token;
    } catch (error) {
      this.logger.error('Eskiz authentication failed', error);
      throw error;
    }
  }

  private async refreshToken(): Promise<string> {
    if (!this.token) {
      return this.authenticate();
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        this.logger.warn('Token refresh failed, re-authenticating...');
        this.token = null;
        return this.authenticate();
      }

      const data = (await response.json()) as EskizAuthResponse;
      this.token = data.data.token;
      this.tokenExpiresAt = Date.now() + 29 * 24 * 60 * 60 * 1000;
      this.logger.log('Eskiz token refreshed');
      return this.token;
    } catch (error) {
      this.logger.warn('Token refresh error, re-authenticating...', error);
      this.token = null;
      return this.authenticate();
    }
  }

  /**
   * Send SMS via Eskiz.uz
   * @param phoneNumber — phone number in format 998XXXXXXXXX (no +)
   * @param message — the text message to send
   */
  async sendSms(phoneNumber: string, message: string): Promise<void> {
    // Normalize: strip + and spaces
    const normalizedPhone = phoneNumber.replace(/[\s+\-()]/g, '');

    if (!this.eskizEmail || !this.eskizPassword) {
      this.logger.log(`[MOCK SMS] To: ${normalizedPhone} | Message: ${message}`);
      return;
    }

    try {
      const token = await this.authenticate();

      const formData = new FormData();
      formData.append('mobile_phone', normalizedPhone);
      formData.append('message', message);
      formData.append('from', '4546');

      const response = await fetch(`${this.baseUrl}/message/sms`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        // Token expired, refresh and retry
        const newToken = await this.refreshToken();
        const retryFormData = new FormData();
        retryFormData.append('mobile_phone', normalizedPhone);
        retryFormData.append('message', message);
        retryFormData.append('from', '4546');

        const retryResponse = await fetch(`${this.baseUrl}/message/sms`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
          body: retryFormData,
        });

        if (!retryResponse.ok) {
          const errorBody = await retryResponse.text();
          throw new Error(`Eskiz SMS retry failed: ${retryResponse.status} — ${errorBody}`);
        }

        this.logger.log(`SMS sent to ${normalizedPhone} via Eskiz (after token refresh)`);
        return;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Eskiz SMS failed: ${response.status} — ${errorBody}`);
      }

      this.logger.log(`SMS sent to ${normalizedPhone} via Eskiz`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${normalizedPhone}`, error);
      this.logger.warn('Falling back to console logging.');
      this.logger.log(`[FALLBACK SMS] To: ${normalizedPhone} | Message: ${message}`);
    }
  }

  /**
   * Send verification OTP code
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    const message = `Mazza: Sizning tasdiqlash kodingiz: ${code}. Kod 15 daqiqa amal qiladi.`;
    await this.sendSms(phoneNumber, message);
  }

  /**
   * Send password reset OTP code
   */
  async sendPasswordResetCode(phoneNumber: string, code: string): Promise<void> {
    const message = `Mazza: Parolni tiklash kodi: ${code}. Kod 10 daqiqa amal qiladi.`;
    await this.sendSms(phoneNumber, message);
  }
}
