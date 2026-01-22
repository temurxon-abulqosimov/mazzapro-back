import { Injectable, Inject } from '@nestjs/common';
import { Booking } from '../../domain/entities/booking.entity';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../domain/repositories/booking.repository.interface';
import { EntityNotFoundException, UnauthorizedAccessException } from '@common/exceptions';

@Injectable()
export class GetBookingByIdUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async execute(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findByIdWithRelations(bookingId);

    if (!booking) {
      throw new EntityNotFoundException('Booking', bookingId);
    }

    // Check ownership
    if (booking.userId !== userId) {
      throw new UnauthorizedAccessException('Booking');
    }

    return booking;
  }
}
