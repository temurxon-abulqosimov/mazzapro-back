import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Service to track database readiness state
 *
 * Used by schedulers and other services to guard against
 * executing queries before the database schema is ready.
 */
@Injectable()
export class DatabaseReadinessService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseReadinessService.name);
  private _isReady = false;
  private _checkedAt: Date | null = null;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // Verify database is accessible on module init
    await this.checkReadiness();
  }

  /**
   * Check if the database is ready for queries
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * When was readiness last verified
   */
  get checkedAt(): Date | null {
    return this._checkedAt;
  }

  /**
   * Actively check database readiness
   */
  async checkReadiness(): Promise<boolean> {
    try {
      // Simple query to verify database connection and schema
      await this.dataSource.query('SELECT 1');

      // Check if key tables exist by querying information_schema
      const tablesResult = await this.dataSource.query(`
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'bookings', 'products', 'stores')
      `);

      const tableCount = parseInt(tablesResult[0]?.count || '0', 10);

      if (tableCount >= 4) {
        this._isReady = true;
        this._checkedAt = new Date();
        this.logger.log('Database readiness check passed');
      } else {
        this._isReady = false;
        this.logger.warn(
          `Database readiness check failed: only ${tableCount}/4 required tables exist`,
        );
      }

      return this._isReady;
    } catch (error) {
      this._isReady = false;
      this.logger.error(
        `Database readiness check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Wait for database to be ready with timeout
   */
  async waitForReady(timeoutMs = 30000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 1000;

    while (Date.now() - startTime < timeoutMs) {
      if (await this.checkReadiness()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    return false;
  }
}
