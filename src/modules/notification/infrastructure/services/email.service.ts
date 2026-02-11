import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private resend: Resend | null = null;
    private from: string;

    constructor(private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('RESEND_API_KEY');
        this.from = this.configService.get<string>('EMAIL_FROM') || 'Mazza <onboarding@resend.dev>';

        if (apiKey) {
            this.resend = new Resend(apiKey);
            this.logger.log('Email service initialized with Resend (HTTPS API)');
        } else {
            this.logger.warn(
                'RESEND_API_KEY not set. Email service running in MOCK mode — emails will be logged to console.',
            );
        }
    }

    // ───────────────────────── core sender ─────────────────────────

    async sendEmail(to: string, subject: string, html: string): Promise<void> {
        if (!this.resend) {
            this.logger.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
            // Strip HTML tags so the OTP is still readable in logs
            this.logger.log(`[MOCK EMAIL] Body: ${html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`);
            return;
        }

        try {
            const { error } = await this.resend.emails.send({
                from: this.from,
                to,
                subject,
                html,
            });

            if (error) {
                throw new Error(error.message);
            }

            this.logger.log(`Email sent to ${to} via Resend`);
        } catch (err) {
            this.logger.error(`Failed to send email to ${to}`, err?.stack || err);
            this.logger.warn('Falling back to console logging.');
            this.logger.log(`[FALLBACK EMAIL] To: ${to} | Subject: ${subject}`);
            this.logger.log(`[FALLBACK EMAIL] Body: ${html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`);
        }
    }

    // ───────────────────────── shared layout ─────────────────────────

    private wrapInLayout(content: string): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ec;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2E7D32, #4CAF50);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">🌿 Mazza</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);letter-spacing:0.5px;">Save food · Save money · Save the planet</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:36px 40px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#999;">© ${new Date().getFullYear()} Mazza · Reducing food waste, one meal at a time.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    // ───────────────────────── email methods ─────────────────────────

    async sendVerificationEmail(to: string, token: string): Promise<void> {
        const subject = 'Verify your email — Mazza';
        const html = this.wrapInLayout(`
              <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a1a;">Verify your email</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                Enter the code below in the app to confirm your email address.
              </p>
              <div style="background:#f0faf0;border:2px dashed #4CAF50;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                <span style="font-size:36px;font-weight:700;color:#2E7D32;letter-spacing:8px;">${token}</span>
              </div>
              <p style="margin:0;font-size:13px;color:#999;">This code expires in 15 minutes. If you didn't create a Mazza account, you can safely ignore this email.</p>
        `);
        await this.sendEmail(to, subject, html);
    }

    async sendForgotPasswordEmail(to: string, token: string): Promise<void> {
        const subject = 'Reset your password — Mazza';
        const html = this.wrapInLayout(`
              <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a1a;">Reset your password</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                We received a request to reset your password. Use the code below to set a new one.
              </p>
              <div style="background:#fff8e1;border:2px dashed #FFA000;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                <span style="font-size:36px;font-weight:700;color:#E65100;letter-spacing:8px;">${token}</span>
              </div>
              <p style="margin:0;font-size:13px;color:#999;">This code expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email.</p>
        `);
        await this.sendEmail(to, subject, html);
    }

    async sendWelcomeEmail(to: string, name: string): Promise<void> {
        const subject = `Welcome to Mazza, ${name}! 🎉`;
        const html = this.wrapInLayout(`
              <div style="text-align:center;margin-bottom:24px;">
                <span style="font-size:56px;">🎉</span>
              </div>
              <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a1a;text-align:center;">Welcome, ${name}!</h2>
              <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;text-align:center;">
                Your email is verified and you're all set. Here's what you can do on Mazza:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:12px 16px;background:#f0faf0;border-radius:10px;margin-bottom:8px;">
                    <p style="margin:0;font-size:14px;color:#2E7D32;"><strong>🛒 Browse</strong> — Discover surplus food from local stores at great prices.</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background:#f0faf0;border-radius:10px;margin-bottom:8px;">
                    <p style="margin:0;font-size:14px;color:#2E7D32;"><strong>📦 Reserve</strong> — Book your surprise bag and pick it up in-store.</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background:#f0faf0;border-radius:10px;">
                    <p style="margin:0;font-size:14px;color:#2E7D32;"><strong>🌍 Impact</strong> — Every order helps reduce food waste in your community.</p>
                  </td>
                </tr>
              </table>
              <div style="text-align:center;">
                <p style="margin:0;font-size:14px;color:#777;">Open the Mazza app and start exploring! 🌿</p>
              </div>
        `);
        await this.sendEmail(to, subject, html);
    }

    async sendWelcomeRegistrationEmail(to: string, name: string): Promise<void> {
        const subject = `You're in! Welcome to Mazza 🌿`;
        const html = this.wrapInLayout(`
              <div style="text-align:center;margin-bottom:20px;">
                <span style="font-size:52px;">👋</span>
              </div>
              <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a1a;text-align:center;">Hey ${name}, welcome aboard!</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;text-align:center;">
                Thanks for joining Mazza — the app that connects you with surplus food from local stores at amazing prices, while helping reduce food waste.
              </p>
              <div style="background:linear-gradient(135deg, #e8f5e9, #f1f8e9);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:32px;">🌿🛒🌍</p>
                <p style="margin:0;font-size:14px;color:#2E7D32;font-weight:600;">Save Food · Save Money · Save the Planet</p>
              </div>
              <p style="margin:0 0 8px;font-size:15px;color:#555;line-height:1.6;">
                <strong>Next step:</strong> Check your inbox for a verification code and enter it in the app to activate your account.
              </p>
              <p style="margin:0;font-size:13px;color:#999;">If you have any questions, just reply to this email — we'd love to help!</p>
        `);
        await this.sendEmail(to, subject, html);
    }
}
