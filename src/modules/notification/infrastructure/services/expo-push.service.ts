import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExpoPushService {
    private expo: Expo;
    private readonly logger = new Logger(ExpoPushService.name);

    constructor(private readonly configService: ConfigService) {
        this.expo = new Expo();
    }

    async sendPushNotifications(tokens: string[], title: string, body: string, data?: any) {
        const messages: ExpoPushMessage[] = [];

        for (const token of tokens) {
            if (!Expo.isExpoPushToken(token)) {
                this.logger.warn(`Push token ${token} is not a valid Expo push token`);
                continue;
            }

            messages.push({
                to: token,
                sound: 'default',
                title,
                body,
                data,
            });
        }

        const chunks = this.expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                this.logger.error('Error sending push notifications', error);
            }
        }

        // Optionally handle receipt ids...
        return tickets;
    }
}
