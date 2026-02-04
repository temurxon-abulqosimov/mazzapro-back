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

export enum FavoriteType {
  STORE = 'STORE',
}

@Entity('favorites')
@Unique(['userId', 'storeId'])
@Index(['userId', 'createdAt'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'store_id' })
  @Index()
  storeId: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;



  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  static create(userId: string, storeId: string): Favorite {
    const favorite = new Favorite();
    favorite.userId = userId;
    favorite.storeId = storeId;
    return favorite;
  }
}
