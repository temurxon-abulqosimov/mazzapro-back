import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '@modules/identity/domain/entities/user.entity';

@Entity('notification_preferences')
export class NotificationPreference {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'new_product_alerts', default: true })
    newProductAlerts: boolean;

    @Column({ name: 'order_updates', default: true })
    orderUpdates: boolean;

    @Column({ name: 'promotional_emails', default: true })
    promotionalEmails: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
