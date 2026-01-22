import { Injectable, Inject } from '@nestjs/common';
import { Market } from '../../domain/entities/market.entity';
import {
  IMarketRepository,
  MARKET_REPOSITORY,
} from '../../domain/repositories/market.repository.interface';
import { EntityNotFoundException } from '@common/exceptions';

@Injectable()
export class GetMarketByIdUseCase {
  constructor(
    @Inject(MARKET_REPOSITORY)
    private readonly marketRepository: IMarketRepository,
  ) {}

  async execute(id: string): Promise<Market> {
    const market = await this.marketRepository.findById(id);
    if (!market) {
      throw new EntityNotFoundException('Market', id);
    }
    return market;
  }
}
