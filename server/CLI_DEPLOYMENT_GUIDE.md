# Deploy Admin API Server via Railway CLI

## Quick Start (Automated)

I've created a script that automates most of the process. However, Railway CLI requires one interactive step that must be done in the dashboard first.

### Step 1: Create Service in Dashboard (One-Time)

Railway CLI cannot create services non-interactively, so you need to do this once:

1. Go to: https://railway.app/project/satisfied-patience
2. Click **"New Service"** → **"GitHub Repo"**
3. Select your repository
4. Set **Root Directory** to: `server`
5. Name the service: `bbb-admin-api` (or any name)
6. Click **"Deploy"**

### Step 2: Run the Deployment Script

After creating the service, run:

```bash
cd server
./deploy-admin-api.sh
```

The script will:
- ✅ Link to the project
- ✅ Link to the new service
- ✅ Set all environment variables
- ✅ Generate a domain
- ✅ Copy SUPABASE_SERVICE_ROLE_KEY from existing service

### Step 3: Update Frontend VITE_API_URL

After deployment, update your frontend service:

```bash
# Link to frontend service
railway service bbb-auto-sales-dms

# Get the admin API domain (from step 2 output)
# Then set it:
railway variables set VITE_API_URL=https://your-admin-api-domain.up.railway.app
```

## Manual CLI Deployment

If you prefer to do it manually:

```bash
# 1. Navigate to server directory
cd server

# 2. Link to project
railway link --project satisfied-patience

# 3. Link to the service (after creating it in dashboard)
railway service bbb-admin-api

# 4. Set environment variables
railway variables set SUPABASE_URL=https://jhymejbyuvavjsywnwjw.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=<your-key>
railway variables set TIMEZONE=America/Chicago
railway variables set PORT=4100

# 5. Deploy
railway up

# 6. Generate domain
railway domain
```

## After Deployment

Test the admin API:
```bash
curl https://your-admin-api-domain/health
```

Should return: `{"status":"ok"}`

Then update frontend and redeploy!



