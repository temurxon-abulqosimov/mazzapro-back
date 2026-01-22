import { Product, ProductStatus } from '../entities/product.entity';

export interface ProductQueryOptions {
  storeId?: string;
  categoryId?: string;
  status?: ProductStatus;
  limit?: number;
  cursor?: string;
}

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findByIdWithRelations(id: string): Promise<Product | null>;
  findByStoreId(storeId: string, options?: ProductQueryOptions): Promise<Product[]>;
  findActiveByStoreId(storeId: string): Promise<Product[]>;
  findExpiredActive(): Promise<Product[]>;
  save(product: Product): Promise<Product>;
  update(id: string, updates: Partial<Product>): Promise<Product>;
  countByStoreId(storeId: string, status?: ProductStatus): Promise<number>;
}

export const PRODUCT_REPOSITORY = Symbol('IProductRepository');
