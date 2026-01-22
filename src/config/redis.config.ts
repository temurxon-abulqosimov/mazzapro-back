import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  tls: boolean;
  url?: string;
}

function parseRedisUrl(url: string | undefined): RedisConfig | null {
  if (!url) {
    return null;
  }

  // Redis URL formats:
  // redis://[[username:]password@]host[:port][/db]
  // rediss://... (TLS)
  try {
    const urlObj = new URL(url);
    const isTls = urlObj.protocol === 'rediss:';

    return {
      host: urlObj.hostname,
      port: parseInt(urlObj.port || '6379', 10),
      password: urlObj.password || undefined,
      db: parseInt(urlObj.pathname.slice(1) || '0', 10),
      tls: isTls,
      url, // Keep original URL for ioredis direct connection
    };
  } catch (error) {
    throw new Error(
      `Invalid REDIS_URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export const redisConfig = registerAs('redis', (): RedisConfig => {
  const redisUrl = process.env.REDIS_URL;
  const parsed = parseRedisUrl(redisUrl);

  if (parsed) {
    return parsed;
  }

  // Fallback to individual environment variables
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    tls: process.env.REDIS_TLS === 'true' || isProduction,
  };
});
