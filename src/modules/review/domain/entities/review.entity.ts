import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToOne,
    Index,
} from 'typeorm';
import { User } from '../../../identity/domain/entities/user.entity';
import { Store } from '../../../store/domain/entities/store.entity';
import { Product } from '../../../catalog/domain/entities/product.entity';
import { Booking } from '../../../booking/domain/entities/booking.entity';

@Entity('reviews')
export class Review {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int' })
    rating: number;

    @Column({ type: 'text', nullable: true })
    comment: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @Column({ name: 'booking_id' })
    bookingId: string;

    @OneToOne('Booking')
    @JoinColumn({ name: 'booking_id' })
    booking: Booking;

    @Column({ name: 'reviewer_id' })
    reviewerId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'reviewer_id' })
    reviewer: User;

    @Column({ name: 'store_id' })
    @Index()
    storeId: string;

    @ManyToOne(() => Store)
    @JoinColumn({ name: 'store_id' })
    store: Store;

    @Column({ name: 'product_id' })
    @Index()
    productId: string;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product: Product;
}
