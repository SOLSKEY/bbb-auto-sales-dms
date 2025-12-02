# Railway CLI Deployment - Complete Instructions

## ⚠️ Important Limitation

Railway CLI **cannot create services non-interactively**. You must create the service once in the Railway dashboard, then I can automate everything else via CLI.

## Two-Step Process

### Step 1: Create Service (Dashboard - One Time Only)

1. Go to: **https://railway.app/project/satisfied-patience**
2. Click **"New Service"** → **"GitHub Repo"**
3. Select your repository
4. Set **Root Directory**: `server`
5. Name it: **`bbb-admin-api`**
6. Click **"Deploy"** (Railway will start deploying)

### Step 2: Run Automated Script (CLI)

After the service is created, run:

```bash
cd server
./quick-deploy.sh
```

This script will:
- ✅ Link to the new service
- ✅ Copy SUPABASE_SERVICE_ROLE_KEY from existing service
- ✅ Set all required environment variables
- ✅ Deploy the code
- ✅ Generate a domain

### Step 3: Update Frontend

After deployment completes, get the domain and update frontend:

```bash
# Link to frontend service
railway service bbb-auto-sales-dms

# Set VITE_API_URL (replace with actual domain from step 2)
railway variables set VITE_API_URL=https://bbb-admin-api-production.up.railway.app

# Redeploy frontend
railway up --detach
```

## Alternative: Manual CLI Commands

If you prefer manual control:

```bash
cd server

# Link to project and service
railway link --project satisfied-patience
railway service bbb-admin-api

# Set variables
railway variables set SUPABASE_URL=https://jhymejbyuvavjsywnwjw.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=<your-key>
railway variables set TIMEZONE=America/Chicago
railway variables set PORT=4100

# Deploy
railway up

# Generate domain
railway domain
```

## Verification

After deployment, test:
```bash
curl https://your-admin-api-domain/health
```

Should return JSON, not HTML.

