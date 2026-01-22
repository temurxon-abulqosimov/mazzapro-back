import { Module } from '@nestjs/common';

// Application
import {
  GetPendingSellersUseCase,
  ProcessSellerApplicationUseCase,
  GetAdminStatsUseCase,
  SELLER_REPOSITORY,
  SEND_NOTIFICATION_USE_CASE,
} from './application/use-cases';

// Presentation
import { AdminController } from './presentation/controllers';

@Module({
  imports: [],
  controllers: [AdminController],
  providers: [
    // Placeholders for cross-module dependencies
    // These should be provided by importing respective modules
    {
      provide: SELLER_REPOSITORY,
      useValue: {
        findById: async () => null,
        save: async (s: any) => s,
        findPendingApplications: async () => [],
        countPendingApplications: async () => 0,
      },
    },
    {
      provide: SEND_NOTIFICATION_USE_CASE,
      useValue: {
        execute: async () => ({}),
      },
    },

    // Use Cases
    GetPendingSellersUseCase,
    ProcessSellerApplicationUseCase,
    GetAdminStatsUseCase,
  ],
  exports: [],
})
export class AdminModule {}
