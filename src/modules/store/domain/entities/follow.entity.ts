import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '@modules/identity/domain/entities/user.entity';
import { Store } from './store.entity';

@Entity('follows')
@Index(['userId', 'storeId'], { unique: true })
export class Follow {
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
}
