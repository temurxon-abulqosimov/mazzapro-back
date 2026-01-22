import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

const isProduction = process.env.NODE_ENV === 'production';

function parseDatabaseUrl(url: string | undefined) {
  if (!url) {
    throw new Error('DATABASE_URL is not defined');
  }

  try {
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      port: parseInt(urlObj.port || '5432', 10),
      username: urlObj.username,
      password: urlObj.password,
      database: urlObj.pathname.slice(1),
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,

  // SSL Configuration (Railway requires this)
  ssl: {
    rejectUnauthorized: false,
  },

  // Entity and Migration Paths - use .js in production, .ts in development
  entities: isProduction
    ? ['dist/**/*.entity.js']
    : ['src/**/*.entity.ts'],
  migrations: isProduction
    ? ['dist/migrations/*.js']
    : ['src/migrations/*.ts'],

  // Logging
  logging: ['error', 'warn', 'migration'],

  // Synchronize should NEVER be true for migrations
  synchronize: false,
});
