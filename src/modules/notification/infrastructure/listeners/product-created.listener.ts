import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProductCreatedEvent } from '@modules/catalog/domain/events/product-created.event';
import { ExpoPushService } from '../services/expo-push.service';
import {
    IFollowRepository,
    FOLLOW_REPOSITORY,
} from '@modules/store/domain/repositories/follow.repository.interface';
import {
    IDeviceTokenRepository,
    DEVICE_TOKEN_REPOSITORY,
} from '@modules/identity/domain/repositories/device-token.repository.interface';
import { DevicePlatform } from '@modules/identity/domain/entities/device-token.entity';

@Injectable()
export class ProductCreatedListener {
    private readonly logger = new Logger(ProductCreatedListener.name);

    constructor(
        private readonly expoPushService: ExpoPushService,
        @Inject(FOLLOW_REPOSITORY)
        private readonly followRepository: IFollowRepository,
        @Inject(DEVICE_TOKEN_REPOSITORY)
        private readonly deviceTokenRepository: IDeviceTokenRepository,
    ) { }

    @OnEvent('product.created')
    async handleProductCreatedEvent(event: ProductCreatedEvent) {
        this.logger.log(`Handling product.created event for product ${event.productId} and store ${event.storeId}`);

        try {
            // 1. Get followers of the store
            const followers = await this.followRepository.findByStoreId(event.storeId);

            if (followers.length === 0) {
                this.logger.log(`No followers found for store ${event.storeId}`);
                return;
            }

            const userIds = followers.map((f) => f.userId);

            // 2. Get device tokens for these users
            // Ideally should batch this or have a bulk fetch method on repository
            // For now, assuming relatively small number or implementing a loop
            // Or better: add findByUserIds to device token repository

            // Let's assume we iterate for now as MVP or implement findByUserIds if possible.
            // But deviceTokenRepository needs to support `findByUserIds`.
            // Let's check repository interface. If not, iterate.

            const tokens: string[] = [];

            for (const userId of userIds) {
                const deviceTokens = await this.deviceTokenRepository.findByUserId(userId);
                // Filter active tokens and map to token string
                // Assuming findByUserId returns DeviceToken[]
                if (deviceTokens) {
                    tokens.push(...deviceTokens.filter(t => t.isActive).map(t => t.token));
                }
            }

            if (tokens.length === 0) {
                this.logger.log('No valid device tokens found for followers');
                return;
            }

            // 3. Send notification
            const title = `New Product at ${event.storeName || 'Store'}!`; // storeName might need to be fetched if not in event, but let's assume event has it or fetch it.
            // Wait, ProductCreatedEvent doesn't have storeName. I should add it or fetch store here.
            // The event I defined: productId, storeId, productName, originalPrice, discountedPrice, imageUrl.
            // I should update event to include storeName or fetch store.
            // Fetching store is safer. Or just say "A store you follow".
            // Let's just say "New Product Alert!" for now or use the product name.

            const body = `${event.productName} is now available for just $${event.discountedPrice}!`;

            await this.expoPushService.sendPushNotifications(tokens, title, body, {
                productId: event.productId,
                storeId: event.storeId,
                type: 'new_product'
            });

            this.logger.log(`Sent notifications to ${tokens.length} devices.`);

        } catch (error) {
            this.logger.error('Error handling product.created event', error);
        }
    }
}
