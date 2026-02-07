import { Injectable, Inject } from '@nestjs/common';
import { Store } from '../../domain/entities/store.entity';
import {
  IStoreRepository,
  STORE_REPOSITORY,
  IFollowRepository,
  FOLLOW_REPOSITORY,
} from '../../domain/repositories';
import { EntityNotFoundException } from '@common/exceptions';

@Injectable()
export class GetStoreByIdUseCase {
  constructor(
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
    @Inject(FOLLOW_REPOSITORY)
    private readonly followRepository: IFollowRepository,
  ) { }

  async execute(id: string, userId?: string): Promise<{ store: Store; isFollowing: boolean }> {
    const store = await this.storeRepository.findByIdWithCategories(id);
    if (!store) {
      throw new EntityNotFoundException('Store', id);
    }

    let isFollowing = false;
    if (userId) {
      isFollowing = await this.followRepository.exists(userId, id);
    }

    return { store, isFollowing };
  }
}
