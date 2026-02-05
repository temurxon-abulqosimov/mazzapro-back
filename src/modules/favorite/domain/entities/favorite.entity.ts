import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '@modules/identity/domain/entities/user.entity';
import { Store } from '@modules/store/domain/entities/store.entity';
import { Product } from '@modules/product/domain/entities/product.entity';

export enum FavoriteType {
  STORE = 'STORE',
  PRODUCT = 'PRODUCT',
}

@Entity('favorites')
@Unique(['userId', 'storeId', 'productId'])
@Index(['userId', 'createdAt'])
@Index(['userId', 'type'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: FavoriteType,
    default: FavoriteType.STORE,
  })
  @Index()
  type: FavoriteType;

  @Column({ name: 'store_id', nullable: true })
  @Index()
  storeId: string | null;

  @ManyToOne(() => Store, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'store_id' })
  store: Store | null;

  @Column({ name: 'product_id', nullable: true })
  @Index()
  productId: string | null;

  @ManyToOne(() => Product, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  static createStore(userId: string, storeId: string): Favorite {
    const favorite = new Favorite();
    favorite.userId = userId;
    favorite.type = FavoriteType.STORE;
    favorite.storeId = storeId;
    favorite.productId = null;
    return favorite;
  }

  static createProduct(userId: string, productId: string): Favorite {
    const favorite = new Favorite();
    favorite.userId = userId;
    favorite.type = FavoriteType.PRODUCT;
    favorite.productId = productId;
    favorite.storeId = null;
    return favorite;
  }
}
