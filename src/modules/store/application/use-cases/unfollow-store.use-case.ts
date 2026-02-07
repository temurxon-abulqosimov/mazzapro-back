import { Injectable, Inject, Logger } from '@nestjs/common';
import {
    IFollowRepository,
    FOLLOW_REPOSITORY,
} from '../../domain/repositories/follow.repository.interface';
import {
    IStoreRepository,
    STORE_REPOSITORY,
} from '../../domain/repositories/store.repository.interface';
import { EntityNotFoundException } from '@common/exceptions';

@Injectable()
export class UnfollowStoreUseCase {
    private readonly logger = new Logger(UnfollowStoreUseCase.name);

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

        await this.followRepository.delete(userId, storeId);
        this.logger.log(`User ${userId} unfollowed store ${storeId}`);
    }
}
