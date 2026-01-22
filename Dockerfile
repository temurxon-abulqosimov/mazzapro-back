# ============================================
# MAZZA Backend - Production Dockerfile
# ============================================
# Multi-stage build for optimized production image
# Node 20 LTS (required by AWS SDK v3)

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install build dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Copy package files only (for better layer caching)
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
# PORT is injected by Railway - default to 3000 for local testing
ENV PORT=3000
ENV HOST=0.0.0.0

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy only necessary files from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Switch to non-root user
USER nestjs

# Expose port (Railway overrides this with its own PORT)
EXPOSE ${PORT}

# Health check using dynamic PORT
# Note: Using shell form to expand $PORT variable
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD sh -c "wget --no-verbose --tries=1 --spider http://localhost:\${PORT:-3000}/health/live || exit 1"

# Start the application
# Migrations are run programmatically in main.ts before app.listen()
# This ensures database schema is ready before any routes or schedulers execute
CMD ["node", "dist/main"]
