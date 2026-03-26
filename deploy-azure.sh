#!/usr/bin/env bash
# HireMatrix AI — Azure deployment script
# Usage: ./deploy-azure.sh [--skip-infra] [--backend-only] [--frontend-only]
#
# Prerequisites:
#   az login && az account set --subscription <id>
#   docker running locally
#
# Required env vars (or edit the VARIABLES section below):
#   DB_PASSWORD, SECRET_KEY, OPENAI_API_KEY
#   Optional: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE, PAYPAL_MONTHLY_PLAN_ID, PAYPAL_ANNUAL_PLAN_ID, PAYPAL_WEBHOOK_ID

set -euo pipefail

# ─── VARIABLES ────────────────────────────────────────────────────────────────
RESOURCE_GROUP="${RESOURCE_GROUP:-hirematrix-rg}"
LOCATION="${LOCATION:-eastus}"
ACR_NAME="${ACR_NAME:-hirematrixacr2}"
CONTAINER_ENV="${CONTAINER_ENV:-hirematrix-env2}"
POSTGRES_SERVER="${POSTGRES_SERVER:-hirematrix-db2}"
REDIS_NAME="${REDIS_NAME:-hirematrix-redis2}"
BACKEND_APP="${BACKEND_APP:-hirematrix-backend}"
SWA_NAME="${SWA_NAME:-hirematrix-frontend}"
POSTGRES_USER="hirematrix"
POSTGRES_DB="hirematrix"

# Secrets — must be provided via env or edited here
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD env var}"
SECRET_KEY="${SECRET_KEY:?Set SECRET_KEY env var}"
OPENAI_API_KEY="${OPENAI_API_KEY:?Set OPENAI_API_KEY env var}"

# Optional PayPal
PAYPAL_CLIENT_ID="${PAYPAL_CLIENT_ID:-}"
PAYPAL_CLIENT_SECRET="${PAYPAL_CLIENT_SECRET:-}"
PAYPAL_MODE="${PAYPAL_MODE:-sandbox}"
PAYPAL_MONTHLY_PLAN_ID="${PAYPAL_MONTHLY_PLAN_ID:-}"
PAYPAL_ANNUAL_PLAN_ID="${PAYPAL_ANNUAL_PLAN_ID:-}"
PAYPAL_WEBHOOK_ID="${PAYPAL_WEBHOOK_ID:-}"

SKIP_INFRA=false
BACKEND_ONLY=false
FRONTEND_ONLY=false

for arg in "$@"; do
  case $arg in
    --skip-infra)  SKIP_INFRA=true ;;
    --backend-only) BACKEND_ONLY=true ;;
    --frontend-only) FRONTEND_ONLY=true ;;
  esac
done

# ─── HELPERS ──────────────────────────────────────────────────────────────────
info()    { echo "[INFO]  $*"; }
success() { echo "[OK]    $*"; }
err()     { echo "[ERROR] $*" >&2; exit 1; }

check_deps() {
  for cmd in az docker; do
    command -v "$cmd" >/dev/null 2>&1 || err "$cmd is not installed"
  done
  az account show >/dev/null 2>&1 || err "Not logged in to Azure. Run: az login"
}

# ─── INFRASTRUCTURE ───────────────────────────────────────────────────────────
provision_infra() {
  info "Creating resource group: $RESOURCE_GROUP in $LOCATION"
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

  info "Creating Container Registry: $ACR_NAME"
  az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Basic \
    --admin-enabled true \
    --output none

  info "Creating PostgreSQL Flexible Server: $POSTGRES_SERVER (this takes ~5 min)"
  az postgres flexible-server create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$POSTGRES_SERVER" \
    --location "$LOCATION" \
    --admin-user "$POSTGRES_USER" \
    --admin-password "$DB_PASSWORD" \
    --tier Burstable \
    --sku-name Standard_B1ms \
    --storage-size 32 \
    --version 15 \
    --public-access 0.0.0.0 \
    --output none

  az postgres flexible-server db create \
    --resource-group "$RESOURCE_GROUP" \
    --server-name "$POSTGRES_SERVER" \
    --database-name "$POSTGRES_DB" \
    --output none

  # Allow all Azure services (Container Apps VNet)
  az postgres flexible-server firewall-rule create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$POSTGRES_SERVER" \
    --rule-name AllowAzureServices \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0 \
    --output none

  info "Creating Azure Cache for Redis: $REDIS_NAME (Basic C0, ~5 min)"
  az redis create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$REDIS_NAME" \
    --location "$LOCATION" \
    --sku Basic \
    --vm-size c0 \
    --output none

  info "Creating Container Apps environment: $CONTAINER_ENV"
  az containerapp env create \
    --name "$CONTAINER_ENV" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output none

  success "Infrastructure provisioned"
}

# ─── BUILD + PUSH BACKEND ─────────────────────────────────────────────────────
deploy_backend() {
  info "Building backend image via ACR (cloud build — no local Docker needed)"
  az acr build \
    --registry "$ACR_NAME" \
    --image "hirematrix-backend:latest" \
    --file backend/Dockerfile \
    backend/

  # Resolve connection strings
  REDIS_KEY=$(az redis list-keys \
    --resource-group "$RESOURCE_GROUP" \
    --name "$REDIS_NAME" \
    --query primaryKey -o tsv)
  REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_NAME}.redis.cache.windows.net:6380/0"
  DATABASE_URL="postgresql://${POSTGRES_USER}:${DB_PASSWORD}@${POSTGRES_SERVER}.postgres.database.azure.com:5432/${POSTGRES_DB}?sslmode=require"
  ACR_SERVER="${ACR_NAME}.azurecr.io"

  # Check if container app already exists
  if az containerapp show --name "$BACKEND_APP" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    info "Updating existing backend container app"
    az containerapp update \
      --name "$BACKEND_APP" \
      --resource-group "$RESOURCE_GROUP" \
      --image "${ACR_SERVER}/hirematrix-backend:latest" \
      --output none
  else
    info "Creating backend container app"
    ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query passwords[0].value -o tsv)

    az containerapp create \
      --name "$BACKEND_APP" \
      --resource-group "$RESOURCE_GROUP" \
      --environment "$CONTAINER_ENV" \
      --image "${ACR_SERVER}/hirematrix-backend:latest" \
      --target-port 8000 \
      --ingress external \
      --registry-server "$ACR_SERVER" \
      --registry-username "$ACR_NAME" \
      --registry-password "$ACR_PASSWORD" \
      --cpu 1.0 \
      --memory 2.0Gi \
      --min-replicas 1 \
      --max-replicas 5 \
      --env-vars \
        "DATABASE_URL=${DATABASE_URL}" \
        "REDIS_URL=${REDIS_URL}" \
        "SECRET_KEY=${SECRET_KEY}" \
        "OPENAI_API_KEY=${OPENAI_API_KEY}" \
        "PAYPAL_CLIENT_ID=${PAYPAL_CLIENT_ID}" \
        "PAYPAL_CLIENT_SECRET=${PAYPAL_CLIENT_SECRET}" \
        "PAYPAL_MODE=${PAYPAL_MODE}" \
        "PAYPAL_MONTHLY_PLAN_ID=${PAYPAL_MONTHLY_PLAN_ID}" \
        "PAYPAL_ANNUAL_PLAN_ID=${PAYPAL_ANNUAL_PLAN_ID}" \
        "PAYPAL_WEBHOOK_ID=${PAYPAL_WEBHOOK_ID}" \
      --output none
  fi

  BACKEND_URL=$(az containerapp show \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --query properties.configuration.ingress.fqdn -o tsv)

  # Update CORS on backend to allow frontend SWA domain (if SWA exists)
  if az staticwebapp show --name "$SWA_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    FRONTEND_URL=$(az staticwebapp show \
      --name "$SWA_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --query defaultHostname -o tsv)
    az containerapp update \
      --name "$BACKEND_APP" \
      --resource-group "$RESOURCE_GROUP" \
      --replace-env-vars \
        "CORS_ORIGINS=https://${FRONTEND_URL}" \
        "FRONTEND_URL=https://${FRONTEND_URL}" \
      --output none 2>/dev/null || true
  fi

  success "Backend deployed: https://$BACKEND_URL"
  echo "$BACKEND_URL" > /tmp/hirematrix_backend_url
}

# ─── FRONTEND (Static Web Apps) ───────────────────────────────────────────────
deploy_frontend() {
  BACKEND_URL=$(cat /tmp/hirematrix_backend_url 2>/dev/null || \
    az containerapp show \
      --name "$BACKEND_APP" \
      --resource-group "$RESOURCE_GROUP" \
      --query properties.configuration.ingress.fqdn -o tsv)

  info "Creating/updating Azure Static Web App: $SWA_NAME"

  if ! az staticwebapp show --name "$SWA_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    az staticwebapp create \
      --name "$SWA_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$LOCATION" \
      --sku Free \
      --output none
  fi

  # Set VITE_API_URL so the SWA build has the backend URL
  az staticwebapp appsettings set \
    --name "$SWA_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --setting-names "VITE_API_URL=https://${BACKEND_URL}" \
    --output none

  FRONTEND_URL=$(az staticwebapp show \
    --name "$SWA_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query defaultHostname -o tsv)

  success "Frontend SWA created: https://$FRONTEND_URL"
  echo ""
  echo "  Next: configure GitHub Actions deployment token for SWA."
  echo "  Run: az staticwebapp secrets list --name $SWA_NAME --resource-group $RESOURCE_GROUP"
  echo "  Add the deployment_token as AZURE_STATIC_WEB_APPS_API_TOKEN in GitHub Secrets."
}

# ─── MAIN ─────────────────────────────────────────────────────────────────────
check_deps

if ! $SKIP_INFRA; then
  provision_infra
fi

if ! $FRONTEND_ONLY; then
  deploy_backend
fi

if ! $BACKEND_ONLY; then
  deploy_frontend
fi

echo ""
echo "========================================"
echo " HireMatrix AI — Deployment Complete"
echo "========================================"
BACKEND_URL=$(cat /tmp/hirematrix_backend_url 2>/dev/null || echo "<backend-url>")
echo " Backend:  https://$BACKEND_URL"
echo " API docs: https://$BACKEND_URL/docs"
echo ""
echo " Frontend will go live after the first GitHub Actions deploy run."
echo " Push to main to trigger it."
echo "========================================"
