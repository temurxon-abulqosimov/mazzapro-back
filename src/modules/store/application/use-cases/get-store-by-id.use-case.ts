import { Injectable, Inject } from '@nestjs/common';
import { Store } from '../../domain/entities/store.entity';
import {
  IStoreRepository,
  STORE_REPOSITORY,
} from '../../domain/repositories/store.repository.interface';
import { EntityNotFoundException } from '@common/exceptions';

@Injectable()
export class GetStoreByIdUseCase {
  constructor(
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
  ) {}

  async execute(id: string): Promise<Store> {
    const store = await this.storeRepository.findByIdWithCategories(id);
    if (!store) {
      throw new EntityNotFoundException('Store', id);
    }
    return store;
  }
}
