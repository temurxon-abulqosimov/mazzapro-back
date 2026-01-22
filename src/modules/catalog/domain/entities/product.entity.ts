import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Store } from '@modules/store/domain/entities/store.entity';
import { Category } from '@modules/store/domain/entities/category.entity';
import { ProductImage } from './product-image.entity';
import { InsufficientStockException, InvalidStateTransitionException } from '@common/exceptions';

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SOLD_OUT = 'SOLD_OUT',
  EXPIRED = 'EXPIRED',
  DEACTIVATED = 'DEACTIVATED',
}

@Entity('products')
@Index(['storeId', 'status'])
@Index(['status', 'expiresAt'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'store_id' })
  @Index()
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'category_id' })
  @Index()
  categoryId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'original_price' })
  originalPrice: number; // cents

  @Column({ name: 'discounted_price' })
  @Index()
  discountedPrice: number; // cents

  @Column()
  quantity: number;

  @Column({ name: 'quantity_reserved', default: 0 })
  quantityReserved: number;

  @Column({ name: 'pickup_window_start', type: 'timestamp with time zone' })
  pickupWindowStart: Date;

  @Column({ name: 'pickup_window_end', type: 'timestamp with time zone' })
  pickupWindowEnd: Date;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  @Index()
  status: ProductStatus;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt: Date;

  @OneToMany(() => ProductImage, (image) => image.product, { cascade: true })
  images: ProductImage[];

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed properties
  get quantityAvailable(): number {
    return this.quantity - this.quantityReserved;
  }

  get discountPercent(): number {
    if (this.originalPrice === 0) return 0;
    return Math.round(
      ((this.originalPrice - this.discountedPrice) / this.originalPrice) * 100,
    );
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isSoldOut(): boolean {
    return this.quantityAvailable <= 0;
  }

  // Domain methods
  publish(): void {
    if (this.status !== ProductStatus.DRAFT) {
      throw new InvalidStateTransitionException('Product', this.status, ProductStatus.ACTIVE);
    }
    this.status = ProductStatus.ACTIVE;
  }

  reserve(quantity: number): void {
    if (this.status !== ProductStatus.ACTIVE) {
      throw new InvalidStateTransitionException('Product', this.status, 'reserve');
    }
    if (quantity > this.quantityAvailable) {
      throw new InsufficientStockException(this.id, quantity, this.quantityAvailable);
    }
    this.quantityReserved += quantity;
    if (this.quantityAvailable === 0) {
      this.status = ProductStatus.SOLD_OUT;
    }
  }

  releaseStock(quantity: number): void {
    this.quantityReserved = Math.max(0, this.quantityReserved - quantity);
    if (this.status === ProductStatus.SOLD_OUT && this.quantityAvailable > 0) {
      this.status = ProductStatus.ACTIVE;
    }
  }

  confirmSale(quantity: number): void {
    this.quantity -= quantity;
    this.quantityReserved -= quantity;
  }

  deactivate(): void {
    if (this.status === ProductStatus.DRAFT) {
      throw new InvalidStateTransitionException('Product', this.status, ProductStatus.DEACTIVATED);
    }
    this.status = ProductStatus.DEACTIVATED;
  }

  reactivate(): void {
    if (this.status !== ProductStatus.DEACTIVATED) {
      throw new InvalidStateTransitionException('Product', this.status, ProductStatus.ACTIVE);
    }
    this.status = this.isSoldOut ? ProductStatus.SOLD_OUT : ProductStatus.ACTIVE;
  }

  markExpired(): void {
    if (this.status === ProductStatus.ACTIVE || this.status === ProductStatus.SOLD_OUT) {
      this.status = ProductStatus.EXPIRED;
    }
  }

  restock(additionalQuantity: number): void {
    this.quantity += additionalQuantity;
    if (this.status === ProductStatus.SOLD_OUT && this.quantityAvailable > 0) {
      this.status = ProductStatus.ACTIVE;
    }
  }
}
