import { Injectable, Inject } from '@nestjs/common';
import { PendingSellerResponseDto } from '../dto';
import { encodeCursor } from '@common/utils/pagination.util';

// Seller repository interface (from Store module)
export interface ISellerRepository {
  findPendingApplications(limit: number, cursor?: string): Promise<any[]>;
  countPendingApplications(): Promise<number>;
  findById(id: string): Promise<any | null>;
  save(seller: any): Promise<any>;
}

export const SELLER_REPOSITORY = Symbol('ISellerRepository');

@Injectable()
export class GetPendingSellersUseCase {
  constructor(
    @Inject(SELLER_REPOSITORY)
    private readonly sellerRepository: ISellerRepository,
  ) {}

  async execute(
    limit = 20,
    cursor?: string,
  ): Promise<{
    sellers: PendingSellerResponseDto[];
    total: number;
    nextCursor?: string;
  }> {
    const [sellers, total] = await Promise.all([
      this.sellerRepository.findPendingApplications(limit, cursor),
      this.sellerRepository.countPendingApplications(),
    ]);

    const hasMore = sellers.length === limit;
    const nextCursor = hasMore && sellers.length > 0
      ? encodeCursor({ lastId: sellers[sellers.length - 1].id })
      : undefined;

    return {
      sellers: sellers.map(this.mapToResponse),
      total,
      nextCursor,
    };
  }

  private mapToResponse(seller: any): PendingSellerResponseDto {
    return {
      id: seller.id,
      businessName: seller.businessName,
      businessType: 'General', // Default value since we don't store businessType
      contactEmail: seller.user?.email || '',
      contactPhone: seller.businessPhone || '',
      address: seller.address || '',
      appliedAt: seller.appliedAt || seller.createdAt,
      user: {
        id: seller.user?.id || seller.userId,
        name: seller.user?.fullName || seller.user?.name || '',
        email: seller.user?.email || '',
      },
    };
  }
}
