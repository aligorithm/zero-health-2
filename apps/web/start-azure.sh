#!/usr/bin/env bash
# Boot script for App Service: runs the standalone Next.js server bundle.
# App Service expects the app to listen on $PORT on all interfaces.
# Also works locally: API_ORIGIN=http://127.0.0.1:4010 PORT=3002 bash start-azure.sh
set -e

export HOSTNAME="0.0.0.0"
export PORT="${PORT:-8080}"
exec node server.js
