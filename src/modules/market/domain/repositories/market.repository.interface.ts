import { Market } from '../entities/market.entity';

export interface IMarketRepository {
  findById(id: string): Promise<Market | null>;
  findBySlug(slug: string): Promise<Market | null>;
  findAll(): Promise<Market[]>;
  findActive(): Promise<Market[]>;
  save(market: Market): Promise<Market>;
}

export const MARKET_REPOSITORY = Symbol('IMarketRepository');
