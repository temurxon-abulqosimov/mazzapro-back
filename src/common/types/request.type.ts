import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  marketId: string;
  sellerId?: string;
}

export enum UserRole {
  CONSUMER = 'CONSUMER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  requestId: string;
}

export interface RequestWithId extends Request {
  requestId: string;
}
