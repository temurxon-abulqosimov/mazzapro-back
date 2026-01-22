import { Injectable, Inject } from '@nestjs/common';
import { Market } from '../../domain/entities/market.entity';
import {
  IMarketRepository,
  MARKET_REPOSITORY,
} from '../../domain/repositories/market.repository.interface';

@Injectable()
export class GetMarketsUseCase {
  constructor(
    @Inject(MARKET_REPOSITORY)
    private readonly marketRepository: IMarketRepository,
  ) {}

  async execute(): Promise<Market[]> {
    return this.marketRepository.findActive();
  }
}
