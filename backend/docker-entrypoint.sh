#!/bin/sh
set -e

# Ensure persistent data directory exists
mkdir -p /app/backend/data

echo "======================================================="
echo "🚀 Starting GV Fitness Backend..."
echo "📡 Main REST API Port: ${PORT:-5000}"
echo "📟 Biometric Gateway Port: ${DEVICE_GATEWAY_PORT:-8081}"
echo "======================================================="

# Auto-run database schema migration on boot if database URL is provided
if [ -n "$DIRECT_URL" ] || [ -n "$DATABASE_URL" ]; then
  echo "📦 Database connection detected. Running schema migration..."
  node src/scripts/migrate.js || echo "⚠️ Migration encountered an issue, proceeding with startup."
fi

# If command arguments are provided, run them; otherwise default to node index.js
if [ "$#" -gt 0 ]; then
  exec "$@"
else
  exec node index.js
fi

