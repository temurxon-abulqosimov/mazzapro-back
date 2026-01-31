# 🚀 MAZZA Backend - Production Deployment Guide

## Overview

This guide covers deploying the MAZZA NestJS backend to Railway with production-grade reliability.

---

## Prerequisites

- Railway account with project created
- Database (PostgreSQL) provisioned on Railway
- GitHub repository connected to Railway

---

## STEP 1: Environment Variables

### Required Variables (Set in Railway Dashboard)

Navigate to your Railway project → Backend Service → Variables tab and set:

```bash
# Database (Auto-provided by Railway if using Railway Postgres)
DATABASE_URL=postgresql://user:password@host:port/dbname

# Node Environment
NODE_ENV=production

# Server Configuration
PORT=3000  # Railway will override this dynamically

# JWT Secrets (CRITICAL - Generate unique values)
JWT_SECRET=<generate-secure-64-char-hex-string>
JWT_REFRESH_SECRET=<generate-different-secure-64-char-hex-string>

# Optional: Payments (set to false if not using Stripe)
PAYMENTS_ENABLED=false

# Optional: Redis (if using)
REDIS_URL=redis://...

# Optional: Firebase (if using push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional: AWS S3 (if using file uploads)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
```

### Generate Secure JWT Secrets

Run locally:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and use it for `JWT_SECRET`. Run again for `JWT_REFRESH_SECRET`.

---

## STEP 2: Railway Configuration

### railway.toml (Already configured)

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health/live"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
numReplicas = 1
```

### Dockerfile (Multi-stage build)

- ✅ Node 20 LTS Alpine
- ✅ Build dependencies for bcrypt
- ✅ Production-only node_modules
- ✅ Non-root user (nestjs)
- ✅ Healthcheck built-in

---

## STEP 3: Deployment Workflow

### Automatic Deployment

Railway automatically deploys when you push to `main`:

```bash
git add .
git commit -m "feat: your changes"
git push origin main
```

Railway will:
1. Detect the push
2. Build the Docker image (30-90 seconds)
3. Run migrations automatically on startup
4. Start the server
5. Perform healthcheck to `/health/live`
6. Route traffic when healthy

### Manual Deployment Trigger

Via Railway Dashboard:
1. Go to your project
2. Click on backend service
3. Click "Deployments" tab
4. Click "Redeploy" on the latest deployment

---

## STEP 4: Migration Strategy

### Automatic Migrations (Default - Recommended)

Migrations run automatically on app startup in `main.ts`:

```typescript
const migrationsSuccessful = await runMigrations();
```

**Behavior:**
- ✅ Migrations run BEFORE app starts accepting traffic
- ✅ If migrations fail, app starts in degraded mode (logs warning)
- ✅ Idempotent - safe to run multiple times
- ✅ No downtime (new deployment runs migrations, then switches traffic)

### Manual Migration Execution (Optional)

If you need to run migrations manually:

```bash
# Via Railway CLI
cd mazza-backend
railway link  # Select your project
railway run npm run migration:run:prod
```

**When to use manual migrations:**
- Complex schema changes that need verification
- Data migrations that take a long time
- Rollback scenarios

### Creating New Migrations

```bash
# Development (locally)
npm run migration:generate -- src/migrations/YourMigrationName

# Check the generated file in src/migrations/
# Add it to src/migrations-list.ts exports
# Commit and push - it will run automatically on next deploy
```

---

## STEP 5: Healthcheck System

### Endpoints

| Endpoint | Purpose | Dependencies | Used By |
|----------|---------|--------------|---------|
| `GET /health/live` | Liveness probe | None (always returns 200) | Railway healthcheck |
| `GET /health` | Full health status | Database, Redis, Schema | Monitoring |
| `GET /health/ready` | Readiness probe | Database, Schema | Load balancers |

### Healthcheck Logic

```typescript
// /health/live - ALWAYS returns 200 if process is alive
{
  "status": "ok",
  "timestamp": "2026-01-31T12:00:00.000Z",
  "uptime": 3600
}

// /health - Returns service health with dependencies
{
  "status": "healthy" | "unhealthy",
  "checks": {
    "database": { "status": "up", "latencyMs": 5 },
    "redis": { "status": "up" },
    "schema": { "status": "up", "ready": true }
  }
}
```

---

## STEP 6: Verification & Testing

### 1. Check Deployment Status

```bash
# Via Railway CLI
railway status

# Via Dashboard
# Check "Deployments" tab for green checkmark
```

### 2. Test Health Endpoints

```bash
# Get your Railway URL (e.g., https://your-app.up.railway.app)
RAILWAY_URL="https://mazzapro-back-production.up.railway.app"

# Test liveness
curl $RAILWAY_URL/health/live

# Expected: {"status":"ok","timestamp":"...","uptime":123}

# Test full health
curl $RAILWAY_URL/health

# Expected: {"status":"healthy",...}
```

### 3. Check Logs

```bash
# Via Railway CLI
railway logs

# Via Dashboard
# Click service → "Logs" tab
```

**Look for:**
```
✅ MAZZA API STARTED SUCCESSFULLY
🚀 Server listening on: http://0.0.0.0:3000
💚 Health Check: http://localhost:3000/health
🗄️  Database: Ready
```

### 4. Test API Endpoints

```bash
# Test API versioning
curl $RAILWAY_URL/api/v1/discovery/products

# Test Swagger docs
open $RAILWAY_URL/docs
```

---

## STEP 7: Production Hardening

### Security Checklist

- ✅ JWT secrets are NOT default values
- ✅ Database uses SSL (`ssl: { rejectUnauthorized: false }`)
- ✅ CORS configured for your frontend domain
- ✅ Rate limiting enabled (Throttler)
- ✅ Validation pipes enabled globally
- ✅ No sensitive data in logs
- ✅ Environment variables not committed to git

### Performance Optimizations

- ✅ Connection pooling configured (max: 10, min: 2)
- ✅ Docker multi-stage build (smaller image)
- ✅ Production dependencies only in final image
- ✅ Gzip compression enabled
- ✅ Query result caching where appropriate

### Monitoring Setup

**Add these to your Railway project:**

1. **Uptime Monitoring**: Use a service like UptimeRobot to ping `/health/live` every 5 minutes

2. **Error Tracking**: Consider adding Sentry
   ```bash
   npm install @sentry/node
   # Configure in main.ts
   ```

3. **Performance Monitoring**: Railway provides built-in metrics
   - CPU usage
   - Memory usage
   - Request latency
   - Response times

---

## STEP 8: Troubleshooting

### App Won't Start (Healthcheck Fails)

**Check logs for:**
1. Configuration validation errors
2. Database connection failures
3. Migration errors
4. Port binding issues

**Common fixes:**
```bash
# Missing JWT secrets
railway variables set JWT_SECRET=<value>
railway variables set JWT_REFRESH_SECRET=<value>

# Database connection issues
railway variables  # Verify DATABASE_URL is set

# Force redeploy
railway up --detach
```

### Migrations Failing

**Symptoms:**
```
⚠️  Migration execution failed or incomplete
⚠️  App will start in degraded mode
```

**Diagnosis:**
```bash
# Check migration status
railway run npm run migration:show

# Try running manually
railway run npm run migration:run:prod
```

**Fix:**
1. Review migration SQL in logs
2. Check if table/column already exists
3. Fix migration file if needed
4. Redeploy

### Database Connection Errors

**Error:** `getaddrinfo ENOTFOUND`

**Fix:** Verify `DATABASE_URL` environment variable is set correctly

**Error:** `SSL SYSCALL error`

**Fix:** Already configured with `ssl: { rejectUnauthorized: false }`

### High Memory Usage

**Symptoms:** App crashes with OOM

**Fixes:**
1. Reduce connection pool size in `app.module.ts`
2. Add pagination to large queries
3. Upgrade Railway plan for more memory

---

## STEP 9: Rollback Procedure

If a deployment breaks production:

### Quick Rollback

```bash
# Via Railway Dashboard
1. Go to "Deployments" tab
2. Find last working deployment
3. Click "..." → "Redeploy"
```

### Database Rollback

```bash
# Revert last migration
railway run npm run migration:revert:prod

# Verify
railway run npm run migration:show
```

---

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **NestJS Docs**: https://docs.nestjs.com
- **TypeORM Docs**: https://typeorm.io

---

## Quick Reference Commands

```bash
# Deploy
git push origin main

# Check status
railway status

# View logs
railway logs

# Run migrations
railway run npm run migration:run:prod

# Show migration status
railway run npm run migration:show

# Revert last migration
railway run npm run migration:revert:prod

# Set environment variable
railway variables set KEY=value

# Link to Railway project
railway link
```

---

**Last Updated:** 2026-01-31
**Version:** 1.0.0
