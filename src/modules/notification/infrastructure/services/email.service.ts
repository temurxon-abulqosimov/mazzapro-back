import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter;
    private from: string;

    constructor(private readonly configService: ConfigService) {
        this.initializeTransporter();
    }

    private initializeTransporter() {
        const host = this.configService.get<string>('EMAIL_HOST');
        const port = this.configService.get<number>('EMAIL_PORT');
        const user = this.configService.get<string>('EMAIL_USER');
        const pass = this.configService.get<string>('EMAIL_PASS');
        this.from = this.configService.get<string>('EMAIL_FROM') || '"Mazza App" <no-reply@mazza.app>';

        if (host && port && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465, // true for 465, false for other ports
                auth: {
                    user,
                    pass,
                },
            });
            this.logger.log(`Email service initialized with host: ${host}`);
        } else {
            this.logger.warn(
                'Email credentials not provided. Email service running in MOCK mode. Emails will be logged to console.',
            );
        }
    }

    async sendEmail(to: string, subject: string, html: string): Promise<void> {
        if (!this.transporter) {
            this.logger.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Content: ${html}`);
            return;
        }

        try {
            await this.transporter.sendMail({
                from: this.from,
                to,
                subject,
                html,
            });
            this.logger.log(`Email sent to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error.stack);
            // Don't throw error to prevent blocking the flow, just log it
        }
    }

    async sendVerificationEmail(to: string, token: string): Promise<void> {
        const subject = 'Verify your email address';
        const html = `
      <h1>Welcome to Mazza!</h1>
      <p>Please verify your email address by entering the following code in the app:</p>
      <h2>${token}</h2>
      <p>This code will expire in 15 minutes.</p>
    `;
        await this.sendEmail(to, subject, html);
    }

    async sendForgotPasswordEmail(to: string, token: string): Promise<void> {
        const subject = 'Reset your password';
        const html = `
      <h1>Reset Password</h1>
      <p>You requested a password reset. Use the following code to reset your password:</p>
      <h2>${token}</h2>
      <p>This code will expire in 15 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
        await this.sendEmail(to, subject, html);
    }

    async sendWelcomeEmail(to: string, name: string): Promise<void> {
        const subject = 'Welcome to Mazza!';
        const html = `
      <h1>Welcome, ${name}!</h1>
      <p>Thank you for verifying your email. We're excited to have you on board.</p>
      <p>Start saving food, money, and the planet!</p>
    `;
        await this.sendEmail(to, subject, html);
    }
}
