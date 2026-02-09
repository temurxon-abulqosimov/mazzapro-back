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
        return this.productRepository.find({
            where: {
                storeId: storeId,
                status: ProductStatus.ACTIVE,
            },
            order: {
                createdAt: 'DESC',
            },
            relations: ['images', 'category'],
        });
    }
}
