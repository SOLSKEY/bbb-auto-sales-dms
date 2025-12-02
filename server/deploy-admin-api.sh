#!/bin/bash
# Deploy Admin API Server to Railway
# This script automates what can be done via CLI

set -e

echo "🚀 Deploying Admin API Server to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Please install it first."
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

echo "📋 Step 1: Link to satisfied-patience project"
cd "$(dirname "$0")"
railway link --project satisfied-patience

echo ""
echo "⚠️  IMPORTANT: You need to create the service FIRST via Railway Dashboard:"
echo ""
echo "   1. Go to: https://railway.app/project/satisfied-patience"
echo "   2. Click 'New Service' → 'GitHub Repo'"
echo "   3. Select your repository"
echo "   4. Set Root Directory to: server"
echo "   5. Name it: bbb-admin-api (or any name you prefer)"
echo "   6. Click 'Deploy'"
echo ""
read -p "Press Enter after you've created the service in Railway dashboard..."

echo ""
echo "📦 Step 2: Link to the new service"
railway service bbb-admin-api

echo ""
echo "🔧 Step 3: Setting environment variables..."
railway variables set SUPABASE_URL=https://jhymejbyuvavjsywnwjw.supabase.co
railway variables set TIMEZONE=America/Chicago
railway variables set PORT=4100

# Get SUPABASE_SERVICE_ROLE_KEY from existing service
echo ""
echo "📋 Step 4: Copying SUPABASE_SERVICE_ROLE_KEY from existing service..."
railway service bbb-auto-sales-dms
SERVICE_ROLE_KEY=$(railway variables | grep SUPABASE_SERVICE_ROLE_KEY | awk '{print $3}')
railway service bbb-admin-api
railway variables set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

echo ""
echo "🌐 Step 5: Generating domain..."
railway domain

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Copy the domain URL from above"
echo "2. Update VITE_API_URL in your frontend service to point to that domain"
echo "3. Redeploy your frontend service"

