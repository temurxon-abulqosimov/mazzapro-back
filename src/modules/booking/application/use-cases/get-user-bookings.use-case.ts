import { Injectable, Inject } from '@nestjs/common';
import { Booking } from '../../domain/entities/booking.entity';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../domain/repositories/booking.repository.interface';

@Injectable()
export class GetUserBookingsUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async execute(userId: string, status?: 'active' | 'past'): Promise<Booking[]> {
    return this.bookingRepository.findByUserId(userId, status);
  }
}
