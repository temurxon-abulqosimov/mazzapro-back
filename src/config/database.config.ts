import { registerAs } from '@nestjs/config';

function parseDatabaseUrl(url: string | undefined) {
  if (!url) {
    return {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USERNAME || 'mazza',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'mazza_db',
      ssl: process.env.DATABASE_SSL === 'true',
    };
  }

  // Parse Railway/PostgreSQL connection string
  // Format: postgresql://user:password@host:port/database
  try {
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      port: parseInt(urlObj.port || '5432', 10),
      username: urlObj.username,
      password: urlObj.password,
      database: urlObj.pathname.slice(1), // Remove leading '/'
      ssl: true, // Railway requires SSL
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${error.message}`);
  }
}

export const databaseConfig = registerAs('database', () => {
  const dbUrl = process.env.DATABASE_URL;
  const parsed = parseDatabaseUrl(dbUrl);

  return {
    ...parsed,
    logging: process.env.DATABASE_LOGGING === 'true',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
  };
});
