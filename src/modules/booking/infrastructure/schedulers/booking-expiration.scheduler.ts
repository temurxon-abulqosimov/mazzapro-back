import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { Booking, BookingStatus } from '../../domain/entities/booking.entity';
import { Product } from '@modules/catalog/domain/entities/product.entity';
import { SendNotificationUseCase } from '@modules/notification/application/use-cases';
import { NotificationType } from '@modules/notification/domain/entities/notification.entity';
import { RedisService } from '@common/redis/redis.service';
import { DatabaseReadinessService } from '@common/services';

@Injectable()
export class BookingExpirationScheduler {
  private readonly logger = new Logger(BookingExpirationScheduler.name);

  // Lock keys for distributed locking across multiple instances
  private readonly EXPIRATION_LOCK_KEY = 'scheduler:booking-expiration:lock';
  private readonly REMINDER_LOCK_KEY = 'scheduler:pickup-reminder:lock';
  private readonly LOCK_TTL_SECONDS = 120; // 2 minutes max lock time

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly sendNotificationUseCase: SendNotificationUseCase,
    private readonly redisService: RedisService,
    private readonly databaseReadiness: DatabaseReadinessService,
  ) {}

  /**
   * Runs every minute to check for expired bookings
   * Transitions CONFIRMED/READY bookings to EXPIRED when pickup window has passed
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredBookings(): Promise<void> {
    // Skip if database schema is not ready (migrations pending)
    if (!this.databaseReadiness.isReady) {
      this.logger.debug('Database not ready, skipping expiration job');
      return;
    }

    // Acquire distributed lock to prevent concurrent runs across cluster
    const lockAcquired = await this.redisService.setNX(
      this.EXPIRATION_LOCK_KEY,
      { startedAt: new Date().toISOString() },
      this.LOCK_TTL_SECONDS,
    );

    if (!lockAcquired) {
      this.logger.debug('Expiration job already running on another instance, skipping');
      return;
    }

    const jobStartTime = Date.now();
    const now = new Date();

    try {
      // Find bookings that should be expired
      const expiredBookings = await this.bookingRepository.find({
        where: {
          status: In([BookingStatus.CONFIRMED, BookingStatus.READY]),
          pickupWindowEnd: LessThan(now),
        },
        relations: ['product', 'store'],
      });

      if (expiredBookings.length === 0) {
        return;
      }

      this.logger.log({
        message: 'Starting booking expiration job',
        bookingsToProcess: expiredBookings.length,
        timestamp: now.toISOString(),
      });

      let successCount = 0;
      let failCount = 0;

      for (const booking of expiredBookings) {
        try {
          // Mark booking as expired
          booking.markExpired();
          await this.bookingRepository.save(booking);

          // Release reserved stock back to product
          const product = await this.productRepository.findOne({
            where: { id: booking.productId },
          });

          if (product) {
            product.releaseStock(booking.quantity);
            await this.productRepository.save(product);
          }

          // Send expiration notification
          await this.sendNotificationUseCase.execute({
            userId: booking.userId,
            type: NotificationType.ORDER_EXPIRED,
            title: 'Order Expired',
            body: `Your order #${booking.orderNumber} has expired. The pickup window has passed.`,
            data: {
              bookingId: booking.id,
              orderNumber: booking.orderNumber,
            },
            sendPush: true,
          });

          successCount++;
          this.logger.log({
            message: 'Booking expired',
            bookingId: booking.id,
            orderNumber: booking.orderNumber,
            userId: booking.userId,
            productId: booking.productId,
            quantityReleased: booking.quantity,
          });
        } catch (error) {
          failCount++;
          this.logger.error({
            message: 'Failed to expire booking',
            bookingId: booking.id,
            orderNumber: booking.orderNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      }

      this.logger.log({
        message: 'Booking expiration job completed',
        totalProcessed: expiredBookings.length,
        successCount,
        failCount,
        durationMs: Date.now() - jobStartTime,
      });
    } catch (error) {
      this.logger.error({
        message: 'Booking expiration job failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        durationMs: Date.now() - jobStartTime,
      });
    } finally {
      // Release the lock
      await this.redisService.del(this.EXPIRATION_LOCK_KEY);
    }
  }

  /**
   * Runs every 30 minutes to send pickup reminders
   * Sends reminder 30 minutes before pickup window ends
   */
  @Cron('*/30 * * * *')
  async handlePickupReminders(): Promise<void> {
    // Skip if database schema is not ready (migrations pending)
    if (!this.databaseReadiness.isReady) {
      this.logger.debug('Database not ready, skipping reminder job');
      return;
    }

    // Acquire distributed lock to prevent concurrent runs across cluster
    const lockAcquired = await this.redisService.setNX(
      this.REMINDER_LOCK_KEY,
      { startedAt: new Date().toISOString() },
      this.LOCK_TTL_SECONDS,
    );

    if (!lockAcquired) {
      this.logger.debug('Reminder job already running on another instance, skipping');
      return;
    }

    const jobStartTime = Date.now();
    const now = new Date();
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
    const sixtyMinutesLater = new Date(now.getTime() + 60 * 60 * 1000);

    try {
      // Find bookings with pickup window ending in next 30-60 minutes
      // that haven't been completed yet
      const bookingsNeedingReminder = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.store', 'store')
        .where('booking.status IN (:...statuses)', {
          statuses: [BookingStatus.CONFIRMED, BookingStatus.READY],
        })
        .andWhere('booking.pickup_window_end > :thirtyMin', { thirtyMin: thirtyMinutesLater })
        .andWhere('booking.pickup_window_end <= :sixtyMin', { sixtyMin: sixtyMinutesLater })
        .getMany();

      if (bookingsNeedingReminder.length === 0) {
        return;
      }

      this.logger.log({
        message: 'Starting pickup reminder job',
        remindersToSend: bookingsNeedingReminder.length,
        timestamp: now.toISOString(),
      });

      let successCount = 0;
      let failCount = 0;

      for (const booking of bookingsNeedingReminder) {
        try {
          const endTime = booking.pickupWindowEnd.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });

          await this.sendNotificationUseCase.execute({
            userId: booking.userId,
            type: NotificationType.PICKUP_REMINDER,
            title: 'Pickup Reminder',
            body: `Don't forget! Pick up your order at ${booking.store?.name || 'the store'} by ${endTime}.`,
            data: {
              bookingId: booking.id,
              orderNumber: booking.orderNumber,
              storeId: booking.storeId,
            },
            sendPush: true,
          });

          successCount++;
          this.logger.debug({
            message: 'Pickup reminder sent',
            bookingId: booking.id,
            orderNumber: booking.orderNumber,
            userId: booking.userId,
          });
        } catch (error) {
          failCount++;
          this.logger.error({
            message: 'Failed to send pickup reminder',
            bookingId: booking.id,
            orderNumber: booking.orderNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.logger.log({
        message: 'Pickup reminder job completed',
        totalProcessed: bookingsNeedingReminder.length,
        successCount,
        failCount,
        durationMs: Date.now() - jobStartTime,
      });
    } catch (error) {
      this.logger.error({
        message: 'Pickup reminder job failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        durationMs: Date.now() - jobStartTime,
      });
    } finally {
      // Release the lock
      await this.redisService.del(this.REMINDER_LOCK_KEY);
    }
  }
}
