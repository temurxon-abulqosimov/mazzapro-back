import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { Booking, BookingStatus } from '../../domain/entities/booking.entity';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { RedisService } from '@common/redis/redis.service';

@Injectable()
export class TypeOrmBookingRepository implements IBookingRepository {
  constructor(
    @InjectRepository(Booking)
    private readonly repository: Repository<Booking>,
    private readonly redisService: RedisService,
  ) {}

  async findById(id: string): Promise<Booking | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['payment'],
    });
  }

  async findByIdWithRelations(id: string): Promise<Booking | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['payment', 'product', 'product.images', 'store', 'user'],
    });
  }

  async findByOrderNumber(orderNumber: string): Promise<Booking | null> {
    return this.repository.findOne({
      where: { orderNumber },
      relations: ['payment', 'product', 'store'],
    });
  }

  async findByIdempotencyKey(key: string): Promise<Booking | null> {
    return this.repository.findOne({
      where: { idempotencyKey: key },
      relations: ['payment'],
    });
  }

  async findByUserId(
    userId: string,
    status?: 'active' | 'past',
  ): Promise<Booking[]> {
    const where: Record<string, unknown> = { userId };

    if (status === 'active') {
      where.status = In([BookingStatus.CONFIRMED, BookingStatus.READY]);
    } else if (status === 'past') {
      where.status = In([
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
        BookingStatus.EXPIRED,
      ]);
    }

    return this.repository.find({
      where,
      relations: ['payment', 'product', 'product.images', 'store'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStoreId(
    storeId: string,
    status?: BookingStatus,
  ): Promise<Booking[]> {
    const where: Record<string, unknown> = { storeId };
    if (status) {
      where.status = status;
    }

    return this.repository.find({
      where,
      relations: ['payment', 'product', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findExpiredActive(): Promise<Booking[]> {
    return this.repository.find({
      where: {
        status: In([BookingStatus.CONFIRMED, BookingStatus.READY]),
        pickupWindowEnd: LessThan(new Date()),
      },
    });
  }

  async save(booking: Booking): Promise<Booking> {
    return this.repository.save(booking);
  }

  async generateOrderNumber(): Promise<string> {
    // Use Redis to generate sequential order numbers per day
    const today = new Date().toISOString().split('T')[0];
    const key = `order_number:${today}`;

    const sequence = await this.redisService.incr(key);

    // Set expiry if this is the first order of the day
    if (sequence === 1) {
      await this.redisService.expire(key, 86400 * 2); // 2 days
    }

    // Format: #XXXXX (5 digits)
    return `#${sequence.toString().padStart(5, '0')}`;
  }
}
