# Railway Service Configuration Guide

## Problem Identified

Root-level `railway.json` and `nixpacks.toml` were conflicting with service-specific configurations. Each Railway service needs to be configured with the correct **Root Directory** in the Railway dashboard.

## Service Configurations Required

### 1. **bbb-admin-api** (satisfied-patience project)

**Railway Dashboard Settings:**
- **Root Directory**: `server`
- **Start Command**: `node index.js` (or leave blank - will use `server/railway.json`)
- **Build Command**: (auto-detected by Nixpacks)

**Configuration Files:**
- Uses: `server/railway.json` → `node index.js`
- Uses: `server/nixpacks.toml` → installs deps and runs `node index.js`

**Expected Behavior:**
- Railway clones repo
- Sets root directory to `server/`
- Runs `npm install` in `server/`
- Runs `node index.js` from `server/`

---

### 2. **bbb-auto-sales-dms** (fabulous-encouragement project - Frontend)

**Railway Dashboard Settings:**
- **Root Directory**: (blank/root) - project root
- **Start Command**: (Railway should auto-detect Vite/Railpack)
- **Build Command**: `npm run build` (if needed)

**Expected Behavior:**
- Railway detects Vite project
- Uses Railpack (frontend builder) automatically
- Builds with `npm run build`
- Serves static files

**If Railpack doesn't work, use:**
- **Start Command**: `npx serve dist -p $PORT`

---

### 3. **bbb-auto-sales-dms** (satisfied-patience project - if it's frontend)

Same as #2 above.

## How to Fix in Railway Dashboard

1. Go to Railway project
2. Click on the service
3. Go to **Settings** tab
4. Scroll to **Deploy** section
5. Set **Root Directory**:
   - For `bbb-admin-api`: `server`
   - For frontend services: (leave blank for root)
6. Verify **Start Command**:
   - For `bbb-admin-api`: `node index.js` (or blank to use config file)
   - For frontend: (auto-detected or `npx serve dist -p $PORT`)
7. Click **Save**
8. Railway will automatically redeploy

## Current Configuration Files

- ✅ `server/railway.json` - Correct for admin-api (when root is `server`)
- ✅ `server/nixpacks.toml` - Correct for admin-api (when root is `server`)
- ❌ Removed root-level `railway.json` - Was conflicting
- ❌ Removed root-level `nixpacks.toml` - Was conflicting
- ❌ Removed root-level `Procfile` - Was conflicting

## Verification

After setting root directories:
1. Check deployment logs
2. Verify start command is correct
3. Test health endpoints:
   - Admin API: `https://bbb-admin-api-production.up.railway.app/health`
   - Frontend: Should serve the React app

