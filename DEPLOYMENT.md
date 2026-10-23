# Deploying Zero Health to Azure

The cheapest hosting that keeps every feature: **two Linux App Service apps on
the Free (F1) tier**, deployed automatically by GitHub Actions on every push
to `main`. Cost: **$0/month** (F1 limits apply, see below).

```
GitHub (main) ──Actions──┬─> <prefix>-api  (App Service, F1)  Express + SQLite + exec + SMTP
                        └─> <prefix>-web  (App Service, F1)  Next.js, proxies /api/* to the API
```

Why App Service and not Functions/Container Apps: the lab needs a real Linux
userland (`child_process.exec` for the C2 lesson), a native module
(`better-sqlite3`), and persistent disk (SQLite + uploaded images). F1 gives
you all of that for free — `/home` persists across restarts and redeploys.

## Before you start

- Azure subscription, `az` CLI (`az login`), and optionally `gh` (GitHub CLI)
- Check the Node runtime available in your region and keep the workflow's
  `NODE_VERSION` in sync with it:
  ```bash
  az webapp list-runtimes --os-type linux | grep NODE   # e.g. NODE:22-lts
  ```
  Mismatched versions break `better-sqlite3` (NODE_MODULE_VERSION error).

## 1. Provision (once)

```bash
NODE_RUNTIME=NODE:22-lts scripts/azure/provision.sh zh-lab-rg westeurope zh-lab F1
```

This creates both apps, points data at persistent paths
(`/home/site/data`, `/home/site/uploads`), sets `HOST=0.0.0.0` +
`I_UNDERSTAND_THIS_IS_INSECURE=1` (required for the app to accept traffic on
App Service — the API refuses non-local binding unless you opt in), and
exports the publish profiles GitHub Actions needs. The API signs tokens
with its built-in lab secret.

## 2. Wire up GitHub

Using the files the script printed instructions for (or the portal):

```bash
gh secret set AZURE_API_PUBLISH_PROFILE < zh-lab-api.publish-profile.xml
gh secret set AZURE_WEB_PUBLISH_PROFILE < zh-lab-web.publish-profile.xml
gh variable set AZURE_API_APP_NAME --body zh-lab-api
gh variable set AZURE_WEB_APP_NAME --body zh-lab-web
```

## 3. Push to `main`

The workflow (`.github/workflows/deploy-azure.yml`) builds both apps, zips
`dist/ + prod node_modules`, deploys each zip, then smoke-tests the health
endpoints. The API seeds itself on first boot (and only if the database file
is missing), so a fresh app comes up with the full demo dataset.

## 4. Configure the agent and email (optional)

```bash
az webapp config appsettings set --name zh-lab-api --resource-group zh-lab-rg --settings \
  AGENT_LLM_BASE_URL="https://your-openai-compatible-endpoint/v1" \
  AGENT_LLM_MODEL="llama3.2" \
  AGENT_LLM_API_KEY="..."
az webapp config appsettings set --name zh-lab-api --resource-group zh-lab-rg --settings \
  SMTP_HOST="smtp.example.com" SMTP_PORT="587" SMTP_USER="..." SMTP_PASS="..."
```

Without these, the agent chat answers 503 and email is printed to the log
(`az webapp log tail --name zh-lab-api --resource-group zh-lab-rg`).

## Operating the lab

- **Logs**: `az webapp log tail --name zh-lab-api --resource-group zh-lab-rg`
- **Reset to a fresh seed**: delete the database and restart
  ```bash
  az webapp ssh --name zh-lab-api --resource-group zh-lab-rg --command "rm -f /home/site/data/zero-health.sqlite"
  az webapp restart --name zh-lab-api --resource-group zh-lab-rg
  ```
- **Data survives deploys and restarts** (it lives outside the deployment
  root). Uploaded images survive too. A redeploy never wipes them.
- **Upgrades**: `az appservice plan update --name zh-lab-plan --resource-group zh-lab-rg --sku B1`
  (always-on, more CPU) — you can upgrade just the API and keep the web free.

## F1 limits and trade-offs

- 60 CPU-minutes/day per app, 1 GB RAM each — fine for a handful of students;
  a busy class will hit the cap.
- No always-on: after ~20 minutes idle the app sleeps, and the first request
  takes a few seconds to wake it.
- Both apps free within the 10-free-apps-per-region quota.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `NODE_MODULE_VERSION` mismatch crash on startup | CI `NODE_VERSION` and the App Service Node runtime differ — make both the same major version. |
| App restarts in a loop, health never green | Check logs with `az webapp log tail`; most commonly a wrong startup file (`bash start-api.sh` / `bash start-azure.sh`). |
| Agent chat returns 503 | `AGENT_LLM_*` app settings not set (expected until you configure a model). |
| Reset link never arrives | SMTP not configured — the email is in the API log instead (by design). |
| `RequestDisallowedByAzure` at plan creation | The region is throttling new subscriptions. Delete the leftover group (`az group delete -n zh-lab-rg --yes --no-wait`) and rerun with another region (northeurope, swedencentral, uksouth, eastus, ...). |
| "Publish profile is invalid for app-name and slot-name" | The profile in the secret doesn't match the app name in the variable: either the API/web secrets are swapped, or the variable names differ from the real app names (`az webapp list`). Re-export both profiles, re-set both secrets with `< file` redirects, and confirm `gh variable list` matches `az webapp list`. |
