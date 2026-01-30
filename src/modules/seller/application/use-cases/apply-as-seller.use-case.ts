import { Injectable, Inject, BadRequestException, ConflictException } from '@nestjs/common';
import { ISellerRepository, SELLER_REPOSITORY } from '@modules/store/domain/repositories/seller.repository.interface';
import { Seller, SellerStatus } from '@modules/store/domain/entities/seller.entity';
import { SellerApplicationDto } from '../dto';

@Injectable()
export class ApplyAsSellerUseCase {
  constructor(
    @Inject(SELLER_REPOSITORY)
    private readonly sellerRepository: ISellerRepository,
  ) {}

  async execute(userId: string, dto: SellerApplicationDto): Promise<Seller> {
    // Check if user already has a seller application
    const existingSeller = await this.sellerRepository.findByUserId(userId);

    if (existingSeller) {
      if (existingSeller.status === SellerStatus.PENDING_REVIEW) {
        throw new ConflictException('You already have a pending seller application');
      }
      if (existingSeller.status === SellerStatus.APPROVED) {
        throw new ConflictException('You are already a seller');
      }
      if (existingSeller.status === SellerStatus.REJECTED) {
        throw new BadRequestException(
          `Your previous application was rejected. Reason: ${existingSeller.rejectionReason || 'Not specified'}`
        );
      }
    }

    // Create new seller application
    const seller = new Seller();
    seller.userId = userId;
    seller.businessName = dto.businessName;
    seller.businessPhone = dto.phoneNumber;
    seller.status = SellerStatus.PENDING_REVIEW;
    seller.appliedAt = new Date();

    // Note: businessType and description from the DTO are not stored in the entity
    // You may want to add these fields to the Seller entity or create a separate table
    // For now, we're just using the required fields

    return await this.sellerRepository.save(seller);
  }
}
