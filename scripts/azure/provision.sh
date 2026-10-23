#!/usr/bin/env bash
# One-time provisioning for the Zero Health lab on Azure App Service.
#
# Usage:
#   scripts/azure/provision.sh <resource-group> <location> <app-prefix> [sku]
# Example:
#   scripts/azure/provision.sh zh-lab-rg westeurope zh-lab F1
#
# Creates two Linux App Service apps on one plan (default F1, free):
#   <prefix>-api   the Express API   (seeds itself on first boot)
#   <prefix>-web   the Next.js web app
#
# Data is placed OUTSIDE the deployment root so it survives redeploys:
#   database -> /home/site/data/zero-health.sqlite
#   uploads  -> /home/site/uploads
#

set -euo pipefail

RG="${1:?usage: provision.sh <resource-group> <location> <app-prefix> [sku]}"
LOCATION="${2:?usage: provision.sh <resource-group> <location> <app-prefix> [sku]}"
PREFIX="${3:?usage: provision.sh <resource-group> <location> <app-prefix> [sku]}"
SKU="${4:-F1}"

NODE_RUNTIME="${NODE_RUNTIME:-NODE:22-lts}"

echo "==> Creating resource group $RG in $LOCATION"
az group create --name "$RG" --location "$LOCATION" -o none

echo "==> Creating App Service plan (${SKU}, Linux)"
az appservice plan create --name "${PREFIX}-plan" --resource-group "$RG" --sku "$SKU" --is-linux -o none

echo "==> Creating API app (${PREFIX}-api)"
az webapp create --name "${PREFIX}-api" --resource-group "$RG" --plan "${PREFIX}-plan" --runtime "$NODE_RUNTIME" -o none

az webapp config appsettings set --name "${PREFIX}-api" --resource-group "$RG" --settings \
  DB_PATH="/home/site/data/zero-health.sqlite" \
  UPLOADS_DIR="/home/site/uploads" \
  HOST="0.0.0.0" \
  I_UNDERSTAND_THIS_IS_INSECURE="1" \
  -o none
az webapp config set --name "${PREFIX}-api" --resource-group "$RG" --startup-file "bash start-api.sh" -o none

echo "==> Creating web app (${PREFIX}-web)"
az webapp create --name "${PREFIX}-web" --resource-group "$RG" --plan "${PREFIX}-plan" --runtime "$NODE_RUNTIME" -o none

az webapp config appsettings set --name "${PREFIX}-web" --resource-group "$RG" --settings \
  API_ORIGIN="https://${PREFIX}-api.azurewebsites.net" \
  -o none
az webapp config set --name "${PREFIX}-web" --resource-group "$RG" --startup-file "bash start-azure.sh" -o none

echo "==> Exporting publish profiles for GitHub Actions"
az webapp deployment list-publishing-profiles --name "${PREFIX}-api" --resource-group "$RG" --xml > "${PREFIX}-api.publish-profile.xml"
az webapp deployment list-publishing-profiles --name "${PREFIX}-web" --resource-group "$RG" --xml > "${PREFIX}-web.publish-profile.xml"

cat <<DONE

Provisioned. Next steps:

1. Add these GitHub repository secrets (contents of the xml files):
       AZURE_API_PUBLISH_PROFILE  <- ${PREFIX}-api.publish-profile.xml
       AZURE_WEB_PUBLISH_PROFILE  <- ${PREFIX}-web.publish-profile.xml
   And these repository variables:
       AZURE_API_APP_NAME = ${PREFIX}-api
       AZURE_WEB_APP_NAME = ${PREFIX}-web

   With the gh CLI:
       gh secret set AZURE_API_PUBLISH_PROFILE < ${PREFIX}-api.publish-profile.xml
       gh secret set AZURE_WEB_PUBLISH_PROFILE < ${PREFIX}-web.publish-profile.xml
       gh variable set AZURE_API_APP_NAME --body "${PREFIX}-api"
       gh variable set AZURE_WEB_APP_NAME --body "${PREFIX}-web"

2. Optional app settings (LLM, SMTP):
       az webapp config appsettings set --name ${PREFIX}-api --resource-group $RG --settings \\
         AGENT_LLM_BASE_URL="https://your-endpoint/v1" AGENT_LLM_MODEL="..." AGENT_LLM_API_KEY="..."
       az webapp config appsettings set --name ${PREFIX}-api --resource-group $RG --settings \\
         SMTP_HOST="..." SMTP_PORT="587" SMTP_USER="..." SMTP_PASS="..."

3. Push to main. GitHub Actions deploys both apps; the API seeds itself on
   first boot. URLs:
       https://${PREFIX}-api.azurewebsites.net
       https://${PREFIX}-web.azurewebsites.net
DONE
