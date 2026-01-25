# Azure Deployment Guide for JobMate AI

## Option 1: Azure Container Apps (Recommended - Easiest)

Azure Container Apps is perfect for Docker-based apps. It's serverless and auto-scales.

### Prerequisites
```bash
# Install Azure CLI
brew install azure-cli  # macOS

# Login
az login
```

### 1. Create Azure Resources

```bash
# Set variables
RESOURCE_GROUP="jobmate-rg"
LOCATION="eastus"
CONTAINER_ENV="jobmate-env"
REDIS_NAME="jobmate-redis"
POSTGRES_SERVER="jobmate-db"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Cache for Redis
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0

# Get Redis connection string
REDIS_KEY=$(az redis list-keys --resource-group $RESOURCE_GROUP --name $REDIS_NAME --query primaryKey -o tsv)
REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_NAME}.redis.cache.windows.net:6380/0?ssl_cert_reqs=required"

# Create Azure Database for PostgreSQL
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --location $LOCATION \
  --admin-user jobmate \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --storage-size 32 \
  --public-access 0.0.0.0

# Allow Azure services to connect
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

DATABASE_URL="postgresql://jobmate:YourSecurePassword123!@${POSTGRES_SERVER}.postgres.database.azure.com:5432/jobmate"

# Create Container Apps environment
az containerapp env create \
  --name $CONTAINER_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### 2. Build and Push Docker Images

```bash
# Build images locally
cd /Users/alisaree/Desktop/JobMateAI
docker-compose build

# Create Azure Container Registry
ACR_NAME="jobmateacr"
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic

# Login to ACR
az acr login --name $ACR_NAME

# Tag and push images
docker tag jobmate-backend ${ACR_NAME}.azurecr.io/jobmate-backend:latest
docker tag jobmate-frontend ${ACR_NAME}.azurecr.io/jobmate-frontend:latest

docker push ${ACR_NAME}.azurecr.io/jobmate-backend:latest
docker push ${ACR_NAME}.azurecr.io/jobmate-frontend:latest
```

### 3. Deploy Container Apps

```bash
# Deploy backend
az containerapp create \
  --name jobmate-backend \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_ENV \
  --image ${ACR_NAME}.azurecr.io/jobmate-backend:latest \
  --target-port 8000 \
  --ingress external \
  --registry-server ${ACR_NAME}.azurecr.io \
  --env-vars \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_URL="$REDIS_URL" \
    SECRET_KEY="your-secret-key-here" \
    OPENAI_API_KEY="your-openai-key" \
  --cpu 1.0 \
  --memory 2.0Gi \
  --min-replicas 1 \
  --max-replicas 10

# Get backend URL
BACKEND_URL=$(az containerapp show \
  --name jobmate-backend \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

# Deploy frontend
az containerapp create \
  --name jobmate-frontend \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_ENV \
  --image ${ACR_NAME}.azurecr.io/jobmate-frontend:latest \
  --target-port 80 \
  --ingress external \
  --registry-server ${ACR_NAME}.azurecr.io \
  --env-vars \
    VITE_API_URL="https://$BACKEND_URL" \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 5

# Get frontend URL
FRONTEND_URL=$(az containerapp show \
  --name jobmate-frontend \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "✅ Deployed!"
echo "Frontend: https://$FRONTEND_URL"
echo "Backend: https://$BACKEND_URL"
```

## Option 2: Azure App Service (Alternative)

Simpler but less flexible than Container Apps.

```bash
# Create App Service Plan
az appservice plan create \
  --name jobmate-plan \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku B1

# Create web apps
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan jobmate-plan \
  --name jobmate-backend-app \
  --deployment-container-image-name ${ACR_NAME}.azurecr.io/jobmate-backend:latest

az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan jobmate-plan \
  --name jobmate-frontend-app \
  --deployment-container-image-name ${ACR_NAME}.azurecr.io/jobmate-frontend:latest

# Configure environment variables
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name jobmate-backend-app \
  --settings \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_URL="$REDIS_URL" \
    SECRET_KEY="your-secret-key" \
    OPENAI_API_KEY="your-openai-key"
```

## Local Docker Testing (Before Azure)

```bash
# Start all services
cd /Users/alisaree/Desktop/JobMateAI
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f redis

# Stop all
docker-compose down

# Clean everything
docker-compose down -v
```

## Cost Estimates (Azure)

**Container Apps (Recommended):**
- Container Apps: ~$30-50/month (with auto-scale)
- Azure Cache for Redis (Basic C0): ~$16/month
- PostgreSQL Flexible (B1ms): ~$12/month
- Container Registry: ~$5/month
- **Total: ~$65-85/month**

**With Production Scale:**
- Container Apps (scaled): ~$100-200/month
- Redis (Standard C1): ~$75/month
- PostgreSQL (GP_Standard_D2s_v3): ~$140/month
- **Total: ~$320-420/month**

## CI/CD with GitHub Actions

Create `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Build and push backend
        run: |
          az acr build --registry jobmateacr \
            --image jobmate-backend:${{ github.sha }} \
            --file backend/Dockerfile \
            backend/
      
      - name: Update backend container
        run: |
          az containerapp update \
            --name jobmate-backend \
            --resource-group jobmate-rg \
            --image jobmateacr.azurecr.io/jobmate-backend:${{ github.sha }}
```

## Monitoring & Troubleshooting

```bash
# Check logs
az containerapp logs show \
  --name jobmate-backend \
  --resource-group $RESOURCE_GROUP \
  --follow

# Scale manually
az containerapp update \
  --name jobmate-backend \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 2 \
  --max-replicas 20

# Check Redis
az redis show \
  --name $REDIS_NAME \
  --resource-group $RESOURCE_GROUP

# Check cache stats via API
curl https://$BACKEND_URL/api/jobs/cache/stats
```

## Production Checklist

- [ ] Set strong SECRET_KEY
- [ ] Configure custom domain
- [ ] Enable HTTPS (automatic with Container Apps)
- [ ] Set up Application Insights for monitoring
- [ ] Configure backup for PostgreSQL
- [ ] Enable Redis persistence
- [ ] Set up alerts for failures
- [ ] Configure CORS properly
- [ ] Review security policies
- [ ] Set up CI/CD pipeline

## Useful Commands

```bash
# Restart services
az containerapp revision restart \
  --name jobmate-backend \
  --resource-group $RESOURCE_GROUP

# View metrics
az containerapp metrics show \
  --name jobmate-backend \
  --resource-group $RESOURCE_GROUP

# Clean up everything
az group delete --name $RESOURCE_GROUP --yes
```
