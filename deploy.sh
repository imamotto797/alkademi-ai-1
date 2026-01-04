#!/bin/bash
# Azure Deployment Script for Alkademi-AI
# This script automates the deployment to Azure using Azure CLI

set -e

# Configuration
RG_NAME="alkademi-ai-rg"
LOCATION="eastus"
APP_NAME="alkademi-ai-app"
ACR_NAME="alkademiacr"
SQL_SERVER="alkademi-sql-server"
SQL_DB="alkademi_db"
STORAGE_ACCOUNT="alkademistorage"

echo "🚀 Starting Azure Deployment for Alkademi-AI"
echo "================================================"

# Check if user is logged in
echo "📋 Checking Azure CLI authentication..."
az account show > /dev/null || az login

# Get subscription info
SUBSCRIPTION=$(az account show --query id -o tsv)
echo "✅ Using subscription: $SUBSCRIPTION"

# Step 1: Create Resource Group
echo ""
echo "📦 Creating resource group: $RG_NAME"
az group create \
  --name $RG_NAME \
  --location $LOCATION || echo "⚠️  Resource group already exists"

# Step 2: Create Container Registry
echo ""
echo "🐳 Creating Container Registry: $ACR_NAME"
az acr create \
  --resource-group $RG_NAME \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true || echo "⚠️  Container Registry already exists"

# Step 3: Create App Service Plan
echo ""
echo "📊 Creating App Service Plan"
az appservice plan create \
  --name "${APP_NAME}-plan" \
  --resource-group $RG_NAME \
  --sku B1 \
  --is-linux || echo "⚠️  App Service Plan already exists"

# Step 4: Create Web App
echo ""
echo "🌐 Creating Web App: $APP_NAME"
az webapp create \
  --resource-group $RG_NAME \
  --plan "${APP_NAME}-plan" \
  --name $APP_NAME \
  --runtime "NODE|18-lts" || echo "⚠️  Web App already exists"

# Step 5: Configure Web App settings
echo ""
echo "⚙️  Configuring Web App settings"
az webapp config appsettings set \
  --resource-group $RG_NAME \
  --name $APP_NAME \
  --settings \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
    PORT=8080 \
    NODE_ENV=production

# Step 6: Enable Continuous Deployment
echo ""
echo "🔄 Enabling deployment slot"
az webapp deployment slot create \
  --resource-group $RG_NAME \
  --name $APP_NAME \
  --slot staging || echo "⚠️  Staging slot already exists"

echo ""
echo "================================================"
echo "✅ Azure Infrastructure Setup Complete!"
echo ""
echo "📝 Next steps:"
echo "1. Set up environment variables in Azure"
echo "2. Deploy the application code"
echo "3. Test the deployment"
echo ""
echo "Deployment URL: https://${APP_NAME}.azurewebsites.net"
echo "================================================"
