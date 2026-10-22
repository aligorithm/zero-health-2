#!/usr/bin/env bash
# Boot script for App Service: App Service expects the app to listen on
# $PORT on all interfaces. Also works locally:
#   API_ORIGIN=http://127.0.0.1:4011 PORT=3001 bash start-azure.sh
set -e

exec node ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p "${PORT:-8080}"
