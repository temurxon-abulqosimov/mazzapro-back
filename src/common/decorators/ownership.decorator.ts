import { SetMetadata } from '@nestjs/common';

export interface OwnershipConfig {
  paramName: string;
  userField: 'id' | 'sellerId';
}

export const OWNERSHIP_KEY = 'ownership';
export const CheckOwnership = (config: OwnershipConfig) =>
  SetMetadata(OWNERSHIP_KEY, config);
