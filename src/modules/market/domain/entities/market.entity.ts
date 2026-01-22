import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('markets')
export class Market {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string;

  @Column({ unique: true })
  @Index()
  slug: string;

  @Column()
  timezone: string;

  @Column({ length: 3 })
  currency: string;

  @Column({ name: 'currency_symbol', length: 5 })
  currencySymbol: string;

  @Column({ name: 'center_lat', type: 'decimal', precision: 10, scale: 7 })
  centerLat: number;

  @Column({ name: 'center_lng', type: 'decimal', precision: 10, scale: 7 })
  centerLng: number;

  @Column({ name: 'default_radius_km', type: 'decimal', precision: 5, scale: 2, default: 10 })
  defaultRadiusKm: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
