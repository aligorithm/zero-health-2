#!/usr/bin/env bash
# Boot script for App Service: prepares persistent paths, seeds the database
# on first boot, then starts the API. Also works locally:
#   PORT=4011 DB_PATH=/tmp/z.db UPLOADS_DIR=/tmp/up bash start-api.sh
set -e

if [ -n "$DB_PATH" ]; then mkdir -p "$(dirname "$DB_PATH")"; fi
if [ -n "$UPLOADS_DIR" ]; then mkdir -p "$UPLOADS_DIR"; fi

if [ -n "$DB_PATH" ] && [ ! -f "$DB_PATH" ]; then
  echo "No database found at $DB_PATH, seeding..."
  node dist/seed.js
fi

exec node dist/server.js
