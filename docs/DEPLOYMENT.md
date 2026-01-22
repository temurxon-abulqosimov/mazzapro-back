# MAZZA Backend - Production Deployment Guide

## Overview

This guide covers deploying the MAZZA NestJS backend to Railway with GitHub Actions CI/CD.

---

## Architecture

```
GitHub (main branch)
    │
    ▼
GitHub Actions (CI/CD)
    │
    ├── Test & Lint
    ├── Build
    ├── Deploy to Railway
    └── Run Migrations
    │
    ▼
Railway
    ├── App Service (NestJS)
    └── PostgreSQL (Private Network)
```

---

## Prerequisites

1. **Railway Account** with a project created
2. **GitHub Repository** with the backend code
3. **Railway PostgreSQL** database provisioned

---

## Railway Setup

### Step 1: Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to existing project (or create new)
railway link
```

### Step 2: Configure Railway Service

In the Railway dashboard:

1. **Service Settings**:
   - **Root Directory**: `/` (or path to mazza-backend if monorepo)
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run migration:run:prod && npm run start:prod`

2. **Health Checks**:
   - **Path**: `/health/live`
   - **Timeout**: 300 seconds

3. **Networking**:
   - Enable public domain for API access
   - Use private networking for PostgreSQL

### Step 3: Configure Environment Variables

In Railway dashboard, set these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection | `${{Postgres.DATABASE_URL}}` |
| `DATABASE_POOL_SIZE` | Connection pool size | `10` |
| `DATABASE_LOGGING` | Enable query logging | `false` |
| `JWT_SECRET` | JWT signing key | `your-secure-secret` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `your-refresh-secret` |
| `JWT_ACCESS_EXPIRATION` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL | `7d` |
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret | `...` |
| `AWS_S3_BUCKET` | S3 bucket name | `mazza-uploads` |
| `REDIS_HOST` | Redis host | `...` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | `...` |

**Important**: Use Railway variable references for PostgreSQL:
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`

---

## GitHub Actions Setup

### Step 1: Add Repository Secrets

In GitHub → Settings → Secrets and variables → Actions:

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN` | Railway API token (from Railway → Account Settings → Tokens) |
| `RAILWAY_APP_URL` | Your Railway app URL (e.g., `https://mazza-backend.up.railway.app`) |

### Step 2: Workflow Files

The following workflows are configured:

1. **`.github/workflows/deploy.yml`** - Production deployment on main branch
2. **`.github/workflows/ci.yml`** - CI checks on pull requests

### Step 3: Enable GitHub Actions

1. Go to repository → Actions tab
2. Enable workflows if prompted

---

## Deployment Flow

### Automatic Deployment (Recommended)

1. Push code to `main` branch
2. GitHub Actions triggers:
   - Installs dependencies
   - Runs tests
   - Builds project
   - Deploys to Railway
   - Railway runs migrations on startup
3. Health check verifies deployment

### Manual Deployment

```bash
# From local machine
cd mazza-backend
railway up --detach
```

---

## Database Migrations

### Running Migrations

Migrations run automatically on deploy via Railway start command.

**Manual migration (if needed)**:

```bash
# Using Railway CLI
railway run npm run migration:run:prod

# Check migration status
railway run npm run migration:show
```

### Creating New Migrations

```bash
# Generate migration from entity changes
npm run migration:generate -- src/migrations/MigrationName

# Create empty migration
npm run migration:create -- src/migrations/MigrationName
```

### Migration Safety

- ✅ `synchronize: false` in production
- ✅ Migrations run before app start
- ✅ Failed migration stops deployment
- ✅ Migrations are idempotent (can run multiple times safely)

---

## Rollback Procedures

### Scenario 1: App Code Rollback

1. **Via GitHub**:
   ```bash
   # Revert to previous commit
   git revert HEAD
   git push origin main
   ```

2. **Via Railway Dashboard**:
   - Go to Deployments
   - Click on previous successful deployment
   - Click "Redeploy"

### Scenario 2: Migration Rollback

```bash
# Connect to Railway and revert last migration
railway run npm run migration:revert:prod

# Verify rollback
railway run npm run migration:show
```

### Scenario 3: Full Rollback (Code + DB)

1. Revert migration first:
   ```bash
   railway run npm run migration:revert:prod
   ```

2. Then revert code:
   ```bash
   git revert HEAD
   git push origin main
   ```

**Warning**: Always revert migrations before reverting code that depends on DB changes.

---

## Monitoring & Logs

### View Logs

```bash
# Stream logs
railway logs --tail

# Via dashboard
# Railway → Service → Logs
```

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health` | Full health check (DB + Redis) |
| `/health/live` | Liveness probe (app running) |
| `/health/ready` | Readiness probe (dependencies ready) |

---

## Troubleshooting

### Deployment Failed

1. Check GitHub Actions logs for test/build errors
2. Check Railway deployment logs
3. Verify environment variables are set

### Migration Failed

1. Check Railway logs for error details
2. Fix migration code
3. Push fix and redeploy

### Database Connection Failed

1. Verify `DATABASE_URL` is set correctly
2. Check PostgreSQL service is running
3. Verify SSL settings (`rejectUnauthorized: false`)

### Health Check Failed

1. Verify health endpoint responds locally
2. Check if migrations succeeded
3. Review application startup logs

---

## Security Checklist

- [ ] `NODE_ENV=production` is set
- [ ] `synchronize: false` in TypeORM config
- [ ] All secrets in Railway/GitHub Secrets (not in code)
- [ ] JWT secrets are strong and unique
- [ ] Database uses SSL
- [ ] No sensitive data in logs
- [ ] Rate limiting enabled
- [ ] CORS configured properly

---

## Environment Variables Reference

### Required for Production

```bash
# Core
NODE_ENV=production
PORT=3000

# Database (Railway auto-provides)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_POOL_SIZE=10

# Auth
JWT_SECRET=<strong-random-string>
JWT_REFRESH_SECRET=<strong-random-string>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=mazza-uploads

# Redis (if using Railway Redis)
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
```

### Optional

```bash
DATABASE_LOGGING=false
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Build for production |
| `npm run start:prod` | Start production server |
| `npm run migration:run:prod` | Run migrations (production) |
| `npm run migration:revert:prod` | Revert last migration |
| `npm run migration:show` | Show migration status |
| `railway up` | Deploy to Railway |
| `railway logs` | View Railway logs |
| `railway run <cmd>` | Run command in Railway environment |
