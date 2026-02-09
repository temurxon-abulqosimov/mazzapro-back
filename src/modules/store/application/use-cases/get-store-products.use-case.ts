import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from '../../../catalog/domain/entities/product.entity';

@Injectable()
export class GetStoreProductsUseCase {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async execute(storeId: string): Promise<Product[]> {
        console.log(`🔍 GetStoreProductsUseCase: Fetching products for store ${storeId}`);
        const products = await this.productRepository.find({
            where: {
                storeId: storeId,
                status: ProductStatus.ACTIVE,
            },
            order: {
                createdAt: 'DESC',
            },
            relations: ['images', 'category'],
        });
        console.log(`✅ GetStoreProductsUseCase: Found ${products.length} active products for store ${storeId}`);
        return products;
    }

    async executeDebug(storeId: string): Promise<Product[]> {
        console.log(`🔍 DEBUG: Fetching ALL products for store ${storeId}`);
        const products = await this.productRepository.find({
            where: {
                storeId: storeId,
            },
            order: {
                createdAt: 'DESC',
            },
            relations: ['images', 'category'],
        });
        console.log(`✅ DEBUG: Found ${products.length} TOTAL products for store ${storeId}`);
        return products;
    }
}
