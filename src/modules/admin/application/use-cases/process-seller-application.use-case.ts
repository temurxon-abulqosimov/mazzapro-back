import { Injectable, Inject, Logger } from '@nestjs/common';
import { NotFoundException, ValidationException } from '@common/exceptions/domain.exception';
import { SellerApplicationAction } from '../dto';
import { ISellerRepository, SELLER_REPOSITORY } from './get-pending-sellers.use-case';

// Notification use case interface
export interface ISendNotificationUseCase {
  execute(dto: {
    userId: string;
    type: string;
    title: string;
    body: string;
    sendPush?: boolean;
  }): Promise<any>;
}

export const SEND_NOTIFICATION_USE_CASE = Symbol('ISendNotificationUseCase');

@Injectable()
export class ProcessSellerApplicationUseCase {
  private readonly logger = new Logger(ProcessSellerApplicationUseCase.name);

  constructor(
    @Inject(SELLER_REPOSITORY)
    private readonly sellerRepository: ISellerRepository,
    @Inject(SEND_NOTIFICATION_USE_CASE)
    private readonly sendNotificationUseCase: ISendNotificationUseCase,
  ) {}

  async execute(
    sellerId: string,
    action: SellerApplicationAction,
    adminUserId: string,
    reason?: string,
  ): Promise<{ success: boolean; newStatus: string }> {
    const seller = await this.sellerRepository.findById(sellerId);
    if (!seller) {
      throw new NotFoundException(`Seller with id ${sellerId} not found`);
    }

    if (!seller.isPending()) {
      throw new ValidationException(`Seller is not pending review. Current status: ${seller.status}`);
    }

    if (action === SellerApplicationAction.APPROVE) {
      // Use domain method for approval
      seller.approve(adminUserId);
      await this.sellerRepository.save(seller);

      // Send approval notification
      await this.sendNotificationUseCase.execute({
        userId: seller.userId,
        type: 'SELLER_APPROVED',
        title: 'Welcome to Mazza!',
        body: 'Your seller application has been approved. Start listing products!',
        sendPush: true,
      });

      this.logger.log(`Seller ${sellerId} approved by admin ${adminUserId}`);
    } else {
      if (!reason) {
        throw new ValidationException('Rejection reason is required');
      }

      // Use domain method for rejection
      seller.reject(reason);
      await this.sellerRepository.save(seller);

      // Send rejection notification
      await this.sendNotificationUseCase.execute({
        userId: seller.userId,
        type: 'SELLER_REJECTED',
        title: 'Application Update',
        body: `Your seller application needs attention: ${reason}`,
        sendPush: true,
      });

      this.logger.log(`Seller ${sellerId} rejected by admin ${adminUserId}: ${reason}`);
    }

    return {
      success: true,
      newStatus: seller.status,
    };
  }
}
