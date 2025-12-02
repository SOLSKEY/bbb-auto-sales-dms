#!/bin/bash
# Quick deploy script - run this AFTER creating the service in Railway dashboard

set -e

SERVICE_NAME=${1:-bbb-admin-api}

echo "🚀 Deploying Admin API Server..."
echo "Service name: $SERVICE_NAME"
echo ""

# Link to service
echo "📋 Linking to service..."
railway service $SERVICE_NAME

# Get existing service role key
echo "📋 Getting SUPABASE_SERVICE_ROLE_KEY from existing service..."
railway service bbb-auto-sales-dms
SERVICE_ROLE_KEY=$(railway variables | grep "SUPABASE_SERVICE_ROLE_KEY" | head -1 | awk -F'│' '{print $3}' | xargs)

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "⚠️  Could not get SERVICE_ROLE_KEY automatically. Please set it manually."
    SERVICE_ROLE_KEY="<paste-your-service-role-key-here>"
fi

# Switch back to admin API service
railway service $SERVICE_NAME

# Set environment variables
echo "🔧 Setting environment variables..."
railway variables set SUPABASE_URL=https://jhymejbyuvavjsywnwjw.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
railway variables set TIMEZONE=America/Chicago
railway variables set PORT=4100

# Deploy
echo "📦 Deploying..."
railway up --detach

# Generate domain
echo "🌐 Generating domain..."
railway domain

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "Next: Update VITE_API_URL in your frontend service with the domain above"
