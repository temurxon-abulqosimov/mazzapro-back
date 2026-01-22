import { User } from '../entities/user.entity';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  save(user: User): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
