# Export Server Railway Configuration Fix

## Problem
Railway is building the **frontend** (using Railpack) instead of running the **export server** (Node.js). This causes:
- Caddy serving static files instead of Node.js running `exportServer.mjs`
- Export shortcut buttons failing with 500 errors
- `/api/shortcut-screenshot` endpoint not available

## Root Cause
Railway detects the root `package.json` with Vite and automatically uses **Railpack** (frontend builder) instead of **Nixpacks** (Node.js builder), even though `railway.json` specifies NIXPACKS.

## Solution Required

### Option 1: Set Root Directory in Railway Dashboard (RECOMMENDED)
1. Go to Railway Dashboard → `bbb-export-server` project
2. Click on the `bbb-export-server` service
3. Go to **Settings** → **Service Settings**
4. Set **Root Directory** to: `export-server`
5. Set **Build Command** to: (leave empty, Nixpacks will auto-detect)
6. Set **Start Command** to: `node exportServer.mjs`

### Option 2: Create Separate Repository (if Option 1 doesn't work)
Move `export-server/` to its own repository and deploy separately.

## Current Configuration Files

### `/export-server/railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node exportServer.mjs",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### `/export-server/nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["corepack enable", "pnpm install --frozen-lockfile"]

[start]
cmd = "node exportServer.mjs"
```

## Environment Variables (Already Set ✅)
- `APP_URL`: https://bbbhq.app
- `SHORTCUT_EMAIL`: key@shaaholdings.com
- `SHORTCUT_PASSWORD`: ETHEN6821
- `TIMEZONE`: America/Chicago
- `NODE_ENV`: production

## Expected Behavior After Fix
1. Railway should use **Nixpacks** (not Railpack)
2. Build should run `pnpm install --frozen-lockfile` in `export-server/` directory
3. Start command should run `node exportServer.mjs`
4. Server should listen on port 3001 (or PORT env var)
5. `/api/shortcut-screenshot` endpoint should be available
6. Export shortcut buttons should work on:
   - Sales page
   - Collections page
   - Commission Report page

## Verification
After fixing, check deployment logs for:
- ✅ `🚀 Export server running on port 3001`
- ✅ `📡 Endpoints: - POST /api/shortcut-screenshot`
- ❌ NOT seeing Caddy logs
- ❌ NOT seeing Vite build output



