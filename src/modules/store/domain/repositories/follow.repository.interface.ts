import { Follow } from '../entities/follow.entity';

export const FOLLOW_REPOSITORY = 'FOLLOW_REPOSITORY';

export interface IFollowRepository {
    create(userId: string, storeId: string): Promise<Follow>;
    delete(userId: string, storeId: string): Promise<void>;
    exists(userId: string, storeId: string): Promise<boolean>;
    findByUserId(userId: string): Promise<Follow[]>;
    findByStoreId(storeId: string): Promise<Follow[]>;
    countByStoreId(storeId: string): Promise<number>;
}
