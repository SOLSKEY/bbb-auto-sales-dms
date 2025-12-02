# Railway Deployment Configuration Summary

## Current Setup

### Project: "satisfied-patience" (Admin API Server)
- **Service**: bbb-auto-sales-dms
- **Domain**: https://bbb-auto-sales-dms-production.up.railway.app
- **Root Directory**: Should be `server/`
- **Start Command**: `node index.js` (admin API server)
- **Config Files Updated**:
  - ✅ `server/railway.json` → runs `node index.js`
  - ✅ `server/nixpacks.toml` → runs `node index.js`
- **Environment Variables**:
  - ✅ TIMEZONE=America/Chicago (already set)
  - ⚠️ VITE_API_URL needs to be set to this service's domain

### Project: "bbb-export-server" (Export Server)
- **Service**: bbb-export-server
- **Domain**: https://bbb-export-server-production.up.railway.app
- **Root Directory**: Should be `export-server/`
- **Start Command**: `node exportServer.mjs`
- **Config Files**:
  - ✅ Already configured correctly
- **Environment Variables**:
  - ⚠️ TIMEZONE=America/Chicago (should be set)
  - ✅ VITE_EXPORT_SERVER_URL already points here

## Next Steps

1. **Verify "satisfied-patience" project service is deploying from `server/` directory**
2. **Set TIMEZONE=America/Chicago on "bbb-export-server" project**
3. **After admin API server is deployed, update VITE_API_URL to point to its domain**

