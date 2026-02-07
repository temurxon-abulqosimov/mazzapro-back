import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { UserRole } from '@common/types';
import { Follow } from '@modules/store/domain/entities/follow.entity';
import { NotificationPreference } from '@modules/notification/domain/entities/notification-preference.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CONSUMER,
  })
  role: UserRole;

  @Column({ name: 'market_id' })
  @Index()
  marketId: string;

  @Column({ name: 'meals_saved', default: 0 })
  mealsSaved: number;

  @Column({ name: 'co2_saved', type: 'decimal', precision: 10, scale: 2, default: 0 })
  co2Saved: number;

  @Column({ name: 'money_saved', default: 0 })
  moneySaved: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number | null;

  @OneToMany(() => Follow, (follow) => follow.user)
  follows: Follow[];

  @OneToOne(() => NotificationPreference, (pref) => pref.user)
  notificationPreferences: NotificationPreference;

  // Domain methods
  updateProfile(fullName?: string, avatarUrl?: string, lat?: number, lng?: number): void {
    if (fullName) this.fullName = fullName;
    if (avatarUrl !== undefined) this.avatarUrl = avatarUrl;
    if (lat !== undefined) this.lat = lat;
    if (lng !== undefined) this.lng = lng;
  }

  promoteToSeller(): void {
    this.role = UserRole.SELLER;
  }

  recordLogin(): void {
    this.lastLoginAt = new Date();
  }

  addMealSaved(meals: number, co2Kg: number, moneyCents: number): void {
    this.mealsSaved += meals;
    this.co2Saved = Number(this.co2Saved) + co2Kg;
    this.moneySaved += moneyCents;
  }

  getLevel(): { name: string; level: number; progress: number } {
    const levels = [
      { threshold: 0, name: 'Food Saver Beginner' },
      { threshold: 5, name: 'Food Saver Level 1' },
      { threshold: 15, name: 'Food Saver Level 2' },
      { threshold: 30, name: 'Food Saver Level 3' },
      { threshold: 50, name: 'Food Saver Level 4' },
      { threshold: 100, name: 'Food Saver Champion' },
    ];

    let currentLevel = 0;
    let currentLevelName = levels[0].name;
    let nextThreshold = levels[1].threshold;
    let prevThreshold = 0;

    for (let i = levels.length - 1; i >= 0; i--) {
      if (this.mealsSaved >= levels[i].threshold) {
        currentLevel = i;
        currentLevelName = levels[i].name;
        prevThreshold = levels[i].threshold;
        nextThreshold = levels[i + 1]?.threshold || levels[i].threshold;
        break;
      }
    }

    const progress =
      nextThreshold === prevThreshold
        ? 100
        : Math.round(
          ((this.mealsSaved - prevThreshold) /
            (nextThreshold - prevThreshold)) *
          100,
        );

    return {
      name: currentLevelName,
      level: currentLevel,
      progress: Math.min(progress, 100),
    };
  }
}
