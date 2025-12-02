# Fix Start Command Issue

## Problem
Railway is running `exportServer.mjs` (which needs APP_URL) instead of `index.js` (admin API server).

## Solution

The configuration files are correct, but Railway service settings might override them.

### Option 1: Fix via Railway Dashboard (Recommended)

1. Go to: https://railway.app/project/satisfied-patience/service/7659c4d8-79b6-4400-8b62-df0a6e706c78
2. Click **"Settings"** tab
3. Scroll to **"Deploy"** section
4. Find **"Start Command"** field
5. Change it to: `node index.js`
6. Click **"Save"**
7. Railway will automatically redeploy

### Option 2: Verify Root Directory

Also check that the **Root Directory** is set to: `server`

If it's set to the project root, Railway might be detecting the wrong file.

## Why This Happened

When you created the service via dashboard, Railway might have:
- Auto-detected `exportServer.mjs` as the entry point
- Set the wrong start command in service settings
- The service settings override the railway.json file

## After Fixing

Once you update the start command in the dashboard:
- Railway will redeploy automatically
- The server should start with `index.js`
- No APP_URL will be needed
- The admin API will work correctly

