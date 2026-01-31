import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { RequestIdInterceptor } from '@common/interceptors/request-id.interceptor';
import {
  validateConfig,
  logValidationResult,
} from '@config/config.validation';
import { AppDataSource } from './data-source';

// Global flag to indicate database readiness
// Exported for use by schedulers and other services
export let isDatabaseReady = false;

async function runMigrations(): Promise<boolean> {
  console.log('=== Running Database Migrations ===');

  try {
    // Initialize the data source
    if (!AppDataSource.isInitialized) {
      console.log('Initializing database connection...');
      await AppDataSource.initialize();
      console.log('Database connection established');
    }

    // Run pending migrations
    console.log('Checking for pending migrations...');
    const pendingMigrations = await AppDataSource.showMigrations();

    if (pendingMigrations) {
      console.log('Running pending migrations...');
      const migrations = await AppDataSource.runMigrations();

      if (migrations.length > 0) {
        console.log(`✅ ${migrations.length} migration(s) executed:`);
        migrations.forEach((m) => console.log(`   - ${m.name}`));
      } else {
        console.log('✅ No pending migrations to run');
      }
    } else {
      console.log('✅ Database schema is up to date');
    }

    // Close the standalone connection (NestJS will manage its own)
    await AppDataSource.destroy();
    console.log('Migration connection closed');

    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error instanceof Error ? error.message : error);

    // Try to close connection if it was opened
    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    } catch {
      // Ignore cleanup errors
    }

    return false;
  }
}

async function seedDefaultMarket(): Promise<void> {
  console.log('=== Checking Default Market ===');

  try {
    // Initialize the data source
    if (!AppDataSource.isInitialized) {
      console.log('Initializing database connection for seeding...');
      await AppDataSource.initialize();
      console.log('Database connection established');
    }

    // Check if any markets exist
    const marketCount = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM markets',
    );
    const count = parseInt(marketCount[0].count);

    if (count === 0) {
      console.log('No markets found. Creating default market...');

      // Create default market for New York area
      await AppDataSource.query(`
        INSERT INTO markets (
          id,
          name,
          slug,
          timezone,
          currency,
          currency_symbol,
          center_lat,
          center_lng,
          default_radius_km,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          '550e8400-e29b-41d4-a716-446655440000',
          'New York City',
          'new-york-city',
          'America/New_York',
          'USD',
          '$',
          40.7128,
          -74.0060,
          10.00,
          true,
          NOW(),
          NOW()
        )
      `);

      console.log('✅ Default market created successfully');
    } else {
      console.log(`✅ Markets already exist (${count} found)`);
    }

    // Close the standalone connection
    await AppDataSource.destroy();
    console.log('Seeding connection closed');
  } catch (error) {
    console.error('❌ Seeding failed:', error instanceof Error ? error.message : error);

    // Try to close connection if it was opened
    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

async function bootstrap() {
  console.log('\n========================================');
  console.log('🚀 Starting MAZZA Backend');
  console.log('========================================');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Port: ${process.env.PORT || '3000 (default)'}`);
  console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
  console.log('========================================\n');

  // Validate configuration - NON-FATAL in production to allow startup
  console.log('🔍 Validating configuration...');
  const validationResult = validateConfig();
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, log errors but don't exit - allow app to start for health checks
  // In development, be strict
  logValidationResult(validationResult, { fatal: !isProduction });

  // Run migrations BEFORE creating the NestJS app
  console.log('\n📦 Running database migrations...');
  const migrationsSuccessful = await runMigrations();

  if (!migrationsSuccessful) {
    console.warn('\n⚠️  Migration execution failed or incomplete');
    console.warn('⚠️  App will start in degraded mode');
    console.warn('⚠️  Database-dependent features may not work\n');
    isDatabaseReady = false;
  } else {
    isDatabaseReady = true;
    console.log('✅ Migrations completed successfully\n');

    // Seed default market if none exist
    console.log('🌱 Checking for default market...');
    await seedDefaultMarket();
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    abortOnError: false, // Don't abort on module init errors - let health check work
  });

  console.log('NestJS application instance created');

  const configService = app.get(ConfigService);

  // API Versioning - exclude health endpoints from prefix using RouteInfo
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix, {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // CORS - Allow all origins without restrictions
  app.enableCors({
    origin: true, // Allow all origins
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Allow all common HTTP methods
    allowedHeaders: '*', // Allow all headers
    exposedHeaders: '*', // Expose all headers
  });

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Interceptors
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger Documentation
  // Enabled for all environments (including production)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MAZZA API')
    .setDescription('Location-based food waste marketplace API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Discovery', 'Product and store discovery')
    .addTag('Products', 'Product management')
    .addTag('Bookings', 'Booking and order management')
    .addTag('Favorites', 'User favorites')
    .addTag('Notifications', 'User notifications')
    .addTag('Users', 'User profile management')
    .addTag('Seller', 'Seller dashboard and product management')
    .addTag('Admin', 'Admin dashboard and management')
    .addTag('Media', 'File upload and media management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Use process.env.PORT directly for Railway compatibility
  // Railway injects PORT dynamically
  const port = process.env.PORT || configService.get<number>('PORT', 3000);

  // Listen on 0.0.0.0 to accept connections from outside the container
  await app.listen(port, '0.0.0.0');

  console.log('\n========================================');
  console.log('✅ MAZZA API STARTED SUCCESSFULLY');
  console.log('========================================');
  console.log(`🚀 Server listening on: http://0.0.0.0:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/docs`);
  console.log(`💚 Health Check: http://localhost:${port}/health`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${isDatabaseReady ? 'Ready' : 'Degraded Mode'}`);
  console.log('========================================\n');
}

bootstrap().catch((err) => {
  console.error('\n========================================');
  console.error('❌ FATAL: Application startup failed');
  console.error('========================================');
  console.error('Error details:', err);
  console.error('Stack trace:', err.stack);
  console.error('========================================\n');

  // In production, log but don't exit if it's a database connection error
  // This allows the container to stay alive for potential recovery
  const isProduction = process.env.NODE_ENV === 'production';
  const isDatabaseError = err.message?.includes('ECONNREFUSED') ||
                          err.message?.includes('database') ||
                          err.code === 'ECONNREFUSED';

  if (isProduction && isDatabaseError) {
    console.error('⚠️  Database connection failed but keeping process alive for healthchecks');
    console.error('⚠️  The app may not function correctly until database is available');
    console.error('⚠️  Container will remain running to prevent deployment loop\n');
    // Don't exit - keep process alive for healthcheck endpoints
  } else {
    process.exit(1);
  }
});
