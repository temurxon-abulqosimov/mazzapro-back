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

async function bootstrap() {
  console.log('=== Starting NestJS application ===');
  console.log(`PORT: ${process.env.PORT || '(not set, using default)'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

  // Validate configuration before proceeding
  const validationResult = validateConfig();
  logValidationResult(validationResult);

  // Run migrations BEFORE creating the NestJS app
  // This ensures database schema exists before any module initializes
  const migrationsSuccessful = await runMigrations();

  if (!migrationsSuccessful) {
    console.warn('⚠️  Migrations failed - app will start but database may not be ready');
    console.warn('⚠️  Schedulers and DB queries may fail until migrations complete');
  } else {
    // Mark database as ready only after successful migrations
    isDatabaseReady = true;
    console.log('✅ Database is ready');
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    abortOnError: false, // Don't abort on module init errors - let health check work
  });

  console.log('NestJS application instance created');

  const configService = app.get(ConfigService);

  // API Versioning - exclude health endpoints from prefix using RouteInfo
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
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

  console.log(`🚀 MAZZA API running on port ${port}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
