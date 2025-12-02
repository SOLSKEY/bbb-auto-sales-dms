# Railway Deployment Configuration Fixes

## Summary

I've fixed the Railway configuration so that:
- **"satisfied-patience"** project runs ONLY the admin API server (`server/index.js`)
- **"bbb-export-server"** project runs ONLY the export server (`export-server/exportServer.mjs`)
- Both servers have timezone configured to `America/Chicago`

## Changes Made

### 1. Fixed "satisfied-patience" Project Configuration
- ✅ Updated `server/railway.json` to run `node index.js` (admin API server)
- ✅ Updated `server/nixpacks.toml` to run `node index.js` (admin API server)
- ✅ TIMEZONE already set to `America/Chicago`

### 2. Verified "bbb-export-server" Project Configuration
- ✅ Already configured to run `node exportServer.mjs`
- ✅ Export server already has timezone handling in code (uses `process.env.TIMEZONE || 'America/Chicago'`)
- ⚠️ Need to set TIMEZONE environment variable on this project

### 3. Environment Variables Status

**"satisfied-patience" project:**
- ✅ TIMEZONE=America/Chicago
- ✅ VITE_API_URL=https://bbb-auto-sales-dms-production.up.railway.app (points to admin API)
- Note: This domain should be the admin API server domain

**"bbb-export-server" project:**
- ⚠️ Need to set: TIMEZONE=America/Chicago

## Next Steps

1. **Deploy the updated configuration** to "satisfied-patience" project so it runs the admin API server
2. **Set TIMEZONE=America/Chicago** on "bbb-export-server" project
3. **Verify** that:
   - Admin API server responds at: https://bbb-auto-sales-dms-production.up.railway.app/health
   - Export server has TIMEZONE set to avoid future date issues

## Files Modified

- `server/railway.json` - Changed start command from `exportServer.mjs` to `index.js`
- `server/nixpacks.toml` - Changed start command from `exportServer.mjs` to `index.js`

