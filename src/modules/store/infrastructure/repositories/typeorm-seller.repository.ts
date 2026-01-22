import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seller, SellerStatus } from '../../domain/entities/seller.entity';
import { ISellerRepository } from '../../domain/repositories/seller.repository.interface';

@Injectable()
export class TypeOrmSellerRepository implements ISellerRepository {
  constructor(
    @InjectRepository(Seller)
    private readonly repository: Repository<Seller>,
  ) {}

  async findById(id: string): Promise<Seller | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<Seller | null> {
    return this.repository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async findByStatus(status: SellerStatus): Promise<Seller[]> {
    return this.repository.find({
      where: { status },
      relations: ['user'],
      order: { appliedAt: 'DESC' },
    });
  }

  async findPendingApplications(limit = 10): Promise<Seller[]> {
    return this.repository.find({
      where: { status: SellerStatus.PENDING_REVIEW },
      relations: ['user'],
      order: { appliedAt: 'ASC' },
      take: limit,
    });
  }

  async save(seller: Seller): Promise<Seller> {
    return this.repository.save(seller);
  }

  async existsByUserId(userId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { userId } });
    return count > 0;
  }
}
