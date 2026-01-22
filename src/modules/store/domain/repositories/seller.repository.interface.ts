import { Seller, SellerStatus } from '../entities/seller.entity';

export interface ISellerRepository {
  findById(id: string): Promise<Seller | null>;
  findByUserId(userId: string): Promise<Seller | null>;
  findByStatus(status: SellerStatus): Promise<Seller[]>;
  findPendingApplications(limit?: number): Promise<Seller[]>;
  save(seller: Seller): Promise<Seller>;
  existsByUserId(userId: string): Promise<boolean>;
}

export const SELLER_REPOSITORY = Symbol('ISellerRepository');
