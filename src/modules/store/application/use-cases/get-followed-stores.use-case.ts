import { Injectable, Inject } from '@nestjs/common';
import { Store } from '../../domain/entities/store.entity';
import {
    IFollowRepository,
    FOLLOW_REPOSITORY,
} from '../../domain/repositories';

@Injectable()
export class GetFollowedStoresUseCase {
    constructor(
        @Inject(FOLLOW_REPOSITORY)
        private readonly followRepository: IFollowRepository,
    ) { }

    async execute(userId: string): Promise<Store[]> {
        const follows = await this.followRepository.findByUserId(userId);
        return follows.map((follow) => follow.store);
    }
}
