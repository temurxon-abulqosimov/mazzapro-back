import { Injectable, Inject, Logger } from '@nestjs/common';
import {
    IFollowRepository,
    FOLLOW_REPOSITORY,
} from '../../domain/repositories/follow.repository.interface';
import {
    IStoreRepository,
    STORE_REPOSITORY,
} from '../../domain/repositories/store.repository.interface';
import { EntityNotFoundException, DomainException } from '@common/exceptions';

@Injectable()
export class FollowStoreUseCase {
    private readonly logger = new Logger(FollowStoreUseCase.name);

    constructor(
        @Inject(FOLLOW_REPOSITORY)
        private readonly followRepository: IFollowRepository,
        @Inject(STORE_REPOSITORY)
        private readonly storeRepository: IStoreRepository,
    ) { }

    async execute(userId: string, storeId: string): Promise<void> {
        const store = await this.storeRepository.findById(storeId);
        if (!store) {
            throw new EntityNotFoundException('Store', storeId);
        }

        const alreadyFollowing = await this.followRepository.exists(userId, storeId);
        if (alreadyFollowing) {
            this.logger.warn(`User ${userId} already follows store ${storeId}`);
            return; // Idempotent success
        }

        await this.followRepository.create(userId, storeId);
        this.logger.log(`User ${userId} followed store ${storeId}`);
    }
}
