#!/usr/bin/env bash
# Restrict an App Service app to a list of CIDRs (e.g. student/office IPs),
# then deny everything else. Usage:
#   scripts/azure/restrict-access.sh <app-name> <resource-group> <cidr> [cidr...]
# Example:
#   scripts/azure/restrict-access.sh zh-lab-api zh-lab-rg 203.0.113.4/32 198.51.100.0/24
#
# Note: restrictions apply to the public site only; the SCM/deployment
# endpoint stays open so GitHub Actions can keep deploying. To also lock
# SCM, see DEPLOYMENT.md ("Hardening").

set -euo pipefail

APP="${1:?usage: restrict-access.sh <app-name> <resource-group> <cidr> [cidr...]}"
RG="${2:?usage: restrict-access.sh <app-name> <resource-group> <cidr> [cidr...]}"
shift 2 || true

if [ $# -eq 0 ]; then
  echo "usage: restrict-access.sh <app-name> <resource-group> <cidr> [cidr...]" >&2
  exit 1
fi

PRIORITY=100
for CIDR in "$@"; do
  echo "==> Allowing $CIDR on $APP"
  az webapp config access-restriction add \
    --name "$APP" --resource-group "$RG" \
    --rule-name "allow-$PRIORITY" --action Allow \
    --ip-address "$CIDR" --priority "$PRIORITY" -o none
  PRIORITY=$((PRIORITY + 1))
done

echo "==> Denying everything else on $APP"
az webapp config access-restriction add \
  --name "$APP" --resource-group "$RG" \
  --rule-name "deny-all" --action Deny \
  --ip-address "0.0.0.0/0" --priority 900 -o none

echo "Done. $APP is now only reachable from the allowed CIDRs."
