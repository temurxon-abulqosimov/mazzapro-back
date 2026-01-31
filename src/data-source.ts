import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config();

const isProduction = process.env.NODE_ENV === 'production';

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
}

function parseDatabaseUrl(url: string): DatabaseConfig {
  try {
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      port: parseInt(urlObj.port || '5432', 10),
      username: urlObj.username,
      password: urlObj.password,
      database: urlObj.pathname.slice(1),
      ssl: true, // URLs typically mean cloud deployment
    };
  } catch (error) {
    throw new Error(
      `Invalid DATABASE_URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

function getDatabaseConfig(): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return parseDatabaseUrl(databaseUrl);
  }

  // Fallback to individual environment variables
  const host = process.env.DATABASE_HOST;
  const database = process.env.DATABASE_NAME;

  if (!host || !database) {
    throw new Error(
      'Database configuration missing: Provide DATABASE_URL or individual fields (DATABASE_HOST, DATABASE_NAME)',
    );
  }

  return {
    host,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    database,
    ssl: process.env.DATABASE_SSL === 'true' || isProduction,
  };
}

const dbConfig = getDatabaseConfig();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,

  // SSL Configuration - only enable if configured or in production
  ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,

  // Entity and Migration Paths - use .js in production, .ts in development
  // In production: __dirname is /app/dist, so we use relative paths from there
  // In development: __dirname is /app/src, so we use relative paths from there
  entities: isProduction
    ? [path.join(__dirname, '**', '*.entity.js')]
    : [path.join(__dirname, '..', 'src', '**', '*.entity.ts')],
  migrations: isProduction
    ? [path.join(__dirname, 'migrations', '*.js')]
    : [path.join(__dirname, '..', 'src', 'migrations', '*.ts')],

  // Logging
  logging: ['error', 'warn', 'migration'],

  // Synchronize should NEVER be true for migrations
  synchronize: false,
});
