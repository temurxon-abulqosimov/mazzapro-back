import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseReadinessService } from './services';

/**
 * Global common module providing shared infrastructure services
 * Available to all modules without explicit imports
 */
@Global()
@Module({
  imports: [TypeOrmModule],
  providers: [DatabaseReadinessService],
  exports: [DatabaseReadinessService],
})
export class CommonModule {}
