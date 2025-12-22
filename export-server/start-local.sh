#!/bin/bash

# Local Export Server Startup Script
# This script starts the export server with local development settings

cd "$(dirname "$0")"

# Set environment variables for local development
export DEV_SERVER_URL=http://localhost:3000
export PORT=3001
export NODE_ENV=development

# Check if .env file exists, if not create a template
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating template..."
    cat > .env << EOF
# Local development server URL
DEV_SERVER_URL=http://localhost:3000

# Export server port
PORT=3001

# Login credentials for automated export
# SHORTCUT_EMAIL=your-email@example.com
# SHORTCUT_PASSWORD=your-password

# Environment
NODE_ENV=development
EOF
    echo "✅ Created .env template. Please add your SHORTCUT_EMAIL and SHORTCUT_PASSWORD"
fi

echo "🚀 Starting local export server..."
echo "📍 Server will run on: http://localhost:3001"
echo "🔗 App URL: http://localhost:3000"
echo ""

npm start



