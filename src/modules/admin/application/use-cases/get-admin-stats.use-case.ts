import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AdminDashboardStatsDto } from '../dto';

@Injectable()
export class GetAdminStatsUseCase {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute(): Promise<AdminDashboardStatsDto> {
    // Run all counts in parallel for efficiency
    const [
      totalUsers,
      totalSellers,
      pendingSellerApplications,
      totalStores,
      activeProducts,
      bookingStats,
      impactStats,
    ] = await Promise.all([
      this.countUsers(),
      this.countSellers(),
      this.countPendingSellers(),
      this.countStores(),
      this.countActiveProducts(),
      this.getBookingStats(),
      this.getImpactStats(),
    ]);

    return {
      // Primary fields matching frontend expectations
      totalUsers,
      activeSellers: totalSellers,
      pendingSellers: pendingSellerApplications,
      totalProducts: activeProducts,
      totalOrders: bookingStats.total,

      // Legacy fields for backward compatibility
      totalSellers,
      pendingSellerApplications,
      totalStores,
      activeProducts,
      totalBookings: bookingStats.total,
      completedBookings: bookingStats.completed,
      totalRevenue: bookingStats.revenue,
      mealsSaved: impactStats.mealsSaved,
      co2Saved: impactStats.co2Saved,
    };
  }

  private async countUsers(): Promise<number> {
    const result = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL',
    );
    return parseInt(result[0]?.count || '0', 10);
  }

  private async countSellers(): Promise<number> {
    const result = await this.dataSource.query(
      "SELECT COUNT(*) as count FROM sellers WHERE status = 'APPROVED'",
    );
    return parseInt(result[0]?.count || '0', 10);
  }

  private async countPendingSellers(): Promise<number> {
    const result = await this.dataSource.query(
      "SELECT COUNT(*) as count FROM sellers WHERE status = 'PENDING_REVIEW'",
    );
    return parseInt(result[0]?.count || '0', 10);
  }

  private async countStores(): Promise<number> {
    const result = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM stores WHERE is_active = true',
    );
    return parseInt(result[0]?.count || '0', 10);
  }

  private async countActiveProducts(): Promise<number> {
    const result = await this.dataSource.query(
      "SELECT COUNT(*) as count FROM products WHERE status = 'ACTIVE'",
    );
    return parseInt(result[0]?.count || '0', 10);
  }

  private async getBookingStats(): Promise<{
    total: number;
    completed: number;
    revenue: number;
  }> {
    const result = await this.dataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
        COALESCE(SUM(total_price) FILTER (WHERE status = 'COMPLETED'), 0) as revenue
      FROM bookings
    `);

    return {
      total: parseInt(result[0]?.total || '0', 10),
      completed: parseInt(result[0]?.completed || '0', 10),
      revenue: parseFloat(result[0]?.revenue || '0'),
    };
  }

  private async getImpactStats(): Promise<{
    mealsSaved: number;
    co2Saved: number;
  }> {
    const result = await this.dataSource.query(`
      SELECT
        COALESCE(SUM(meals_saved), 0) as meals_saved,
        COALESCE(SUM(co2_saved), 0) as co2_saved
      FROM users
    `);

    return {
      mealsSaved: parseInt(result[0]?.meals_saved || '0', 10),
      co2Saved: parseFloat(result[0]?.co2_saved || '0'),
    };
  }
}
