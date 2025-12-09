# Railway Deployment Configuration - Complete

## ✅ All Changes Applied

### 1. **"satisfied-patience" Project (Admin API Server)**
- ✅ **Configuration Files Updated:**
  - `server/railway.json` → Now runs `node index.js` (admin API server)
  - `server/nixpacks.toml` → Now runs `node index.js` (admin API server)
  
- ✅ **Environment Variables:**
  - `TIMEZONE=America/Chicago` (already set)
  - `VITE_API_URL=https://bbb-auto-sales-dms-production.up.railway.app` (points to admin API domain)

- 📝 **Domain:** https://bbb-auto-sales-dms-production.up.railway.app
- 📝 **Next Deploy:** Will run the admin API server (`server/index.js`)

### 2. **"bbb-export-server" Project (Export Server)**
- ✅ **Configuration Files:**
  - Already correctly configured to run `node exportServer.mjs`
  - `export-server/railway.json` → runs `node exportServer.mjs`
  - `export-server/nixpacks.toml` → runs `node exportServer.mjs`

- ✅ **Environment Variables:**
  - `TIMEZONE=America/Chicago` ✅ **JUST SET**
  - Export server code already uses `process.env.TIMEZONE || 'America/Chicago'`

- 📝 **Domain:** https://bbb-export-server-production.up.railway.app
- 📝 **Status:** Ready to deploy with timezone configuration

## Summary of Fixes

### What Was Wrong
1. ❌ The `server/railway.json` and `server/nixpacks.toml` were configured to run `exportServer.mjs` (export server) instead of `index.js` (admin API server)
2. ❌ TIMEZONE was not set on the export-server project, causing future date issues

### What Was Fixed
1. ✅ Updated `server/railway.json` to run `node index.js` (admin API server)
2. ✅ Updated `server/nixpacks.toml` to run `node index.js` (admin API server)
3. ✅ Set `TIMEZONE=America/Chicago` on "bbb-export-server" project

## Next Steps

1. **Deploy "satisfied-patience" project:**
   - Railway will automatically detect the config changes
   - On next deploy, it will run the admin API server
   - The service at `bbb-auto-sales-dms-production.up.railway.app` will serve the admin API

2. **Verify Admin API Server:**
   - Test: `curl https://bbb-auto-sales-dms-production.up.railway.app/health`
   - Should return: `{"status":"ok"}` or similar

3. **Verify Export Server Timezone:**
   - The export server will now use `America/Chicago` timezone
   - This should fix the future date issues you were experiencing

4. **Frontend VITE_API_URL:**
   - If your frontend is deployed separately (Vercel, Netlify, etc.), make sure `VITE_API_URL` is set to:
     ```
     VITE_API_URL=https://bbb-auto-sales-dms-production.up.railway.app
     ```
   - If your frontend is in Railway, it should already be set (as we saw in the variables)

## Files Modified

- ✅ `server/railway.json` - Changed start command to `node index.js`
- ✅ `server/nixpacks.toml` - Changed start command to `node index.js`
- ✅ Environment variable `TIMEZONE=America/Chicago` set on export-server project

## Timezone Configuration

Both servers now use Central Standard Time (America/Chicago):
- **Admin API Server:** Uses `TIMEZONE` env var (set to `America/Chicago`)
- **Export Server:** Uses `process.env.TIMEZONE || 'America/Chicago'` in code (now set via env var)

This ensures:
- ✅ Dates are calculated correctly in exports
- ✅ No more future date issues
- ✅ Consistent timezone across all services



