#!/bin/bash
set -e

echo "=== MAZZA Database Migration ==="
echo "Environment: ${NODE_ENV:-development}"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Validate required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

# Run migrations
echo "Running TypeORM migrations..."
npm run migration:run

if [ $? -eq 0 ]; then
  echo "SUCCESS: Migrations completed successfully"
  exit 0
else
  echo "ERROR: Migration failed"
  exit 1
fi
