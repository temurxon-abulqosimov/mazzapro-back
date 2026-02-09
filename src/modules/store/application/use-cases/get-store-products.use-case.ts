import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../../catalog/domain/entities/product.entity';

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
                isActive: true,
            },
            order: {
                createdAt: 'DESC',
            },
            relations: ['images', 'category'],
        });
    }
}
