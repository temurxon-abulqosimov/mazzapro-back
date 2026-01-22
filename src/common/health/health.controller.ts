import { Controller, Get, HttpStatus, Res, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '@common/redis/redis.service';
import { Public } from '@common/decorators/public.decorator';
import { Response } from 'express';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: 'up' | 'down'; latencyMs?: number };
    redis: { status: 'up' | 'down'; latencyMs?: number };
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    @Optional()
    @InjectDataSource()
    private readonly dataSource: DataSource | null,
    @Optional()
    private readonly redisService: RedisService | null,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(@Res() res: Response): Promise<void> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    const isHealthy = checks.database.status === 'up' && checks.redis.status === 'up';

    const response: HealthStatus = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    };

    res.status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(response);
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe - checks if the service is running' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe - checks if the service can accept traffic' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready(@Res() res: Response): Promise<void> {
    const dbCheck = await this.checkDatabase();
    const isReady = dbCheck.status === 'up';

    const response = {
      status: isReady ? 'ok' : 'unavailable',
      ready: isReady,
    };

    res.status(isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(response);
  }

  private async checkDatabase(): Promise<{ status: 'up' | 'down'; latencyMs?: number }> {
    if (!this.dataSource) {
      return { status: 'down' };
    }
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch {
      return { status: 'down' };
    }
  }

  private async checkRedis(): Promise<{ status: 'up' | 'down'; latencyMs?: number }> {
    if (!this.redisService) {
      return { status: 'down' };
    }
    const start = Date.now();
    try {
      await this.redisService.ping();
      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch {
      return { status: 'down' };
    }
  }
}
