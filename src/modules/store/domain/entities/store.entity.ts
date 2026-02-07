import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Seller } from './seller.entity';
import { Category } from './category.entity';
import { Follow } from './follow.entity';

@Entity('stores')
@Index(['lat', 'lng'])
@Index(['isActive', 'lat', 'lng']) // Optimizes geo-discovery queries filtering active stores
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  @Index()
  sellerId: string;

  @ManyToOne(() => Seller)
  @JoinColumn({ name: 'seller_id' })
  seller: Seller;

  @Column({ name: 'market_id' })
  @Index()
  marketId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
  rating: number;

  @Column({ name: 'review_count', default: 0 })
  reviewCount: number;

  @Column({ name: 'total_products_sold', default: 0 })
  totalProductsSold: number;

  @Column({ name: 'total_revenue', default: 0 })
  totalRevenue: number;

  @Column({ name: 'food_saved_kg', type: 'decimal', precision: 10, scale: 2, default: 0 })
  foodSavedKg: number;

  @Column({ name: 'is_active', default: true })
  @Index()
  isActive: boolean;

  @Column({ name: 'is_open', default: true })
  isOpen: boolean;

  @OneToMany(() => Follow, (follow) => follow.store)
  follows: Follow[];

  @ManyToMany(() => Category)
  @JoinTable({
    name: 'store_categories',
    joinColumn: { name: 'store_id' },
    inverseJoinColumn: { name: 'category_id' },
  })
  categories: Category[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Domain methods
  updateProfile(data: {
    name?: string;
    description?: string;
    address?: string;
    city?: string;
    imageUrl?: string;
  }): void {
    if (data.name) this.name = data.name;
    if (data.description !== undefined) this.description = data.description;
    if (data.address) this.address = data.address;
    if (data.city) this.city = data.city;
    if (data.imageUrl !== undefined) this.imageUrl = data.imageUrl;
  }

  updateLocation(lat: number, lng: number): void {
    this.lat = lat;
    this.lng = lng;
  }

  recordSale(quantity: number, revenue: number, foodKg: number): void {
    this.totalProductsSold += quantity;
    this.totalRevenue += revenue;
    this.foodSavedKg = Number(this.foodSavedKg) + foodKg;
  }

  updateRating(newRating: number): void {
    const totalRatingPoints = this.rating * this.reviewCount;
    this.reviewCount += 1;
    this.rating = Number(
      ((totalRatingPoints + newRating) / this.reviewCount).toFixed(1),
    );
  }

  deactivate(): void {
    this.isActive = false;
  }

  activate(): void {
    this.isActive = true;
  }

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
  }
}
