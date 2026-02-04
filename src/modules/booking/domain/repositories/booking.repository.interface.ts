import { Booking, BookingStatus } from '../entities/booking.entity';

export interface IBookingRepository {
  findById(id: string): Promise<Booking | null>;
  findByIdWithRelations(id: string): Promise<Booking | null>;
  findByOrderNumber(orderNumber: string): Promise<Booking | null>;
  findByIdempotencyKey(key: string): Promise<Booking | null>;
  findByUserId(userId: string, status?: 'active' | 'past'): Promise<Booking[]>;
  findByStoreId(storeId: string, status?: BookingStatus): Promise<Booking[]>;
  findByStoreIdAndDateRange(
    storeId: string,
    status: BookingStatus,
    startDate: Date,
    endDate: Date,
  ): Promise<Booking[]>;
  countByStoreIdAndStatus(storeId: string, status: BookingStatus): Promise<number>;
  findExpiredActive(): Promise<Booking[]>;
  save(booking: Booking): Promise<Booking>;
  generateOrderNumber(): Promise<string>;
}

export const BOOKING_REPOSITORY = Symbol('IBookingRepository');
