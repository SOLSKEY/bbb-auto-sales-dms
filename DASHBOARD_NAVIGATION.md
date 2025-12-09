# How to Fix Start Command in Railway Dashboard

## Simple Navigation Steps

1. **Go to Railway Dashboard**: https://railway.app
2. **Click on "satisfied-patience" project**
3. **Find the service "bbb-admin-api"** (it should be listed alongside "bbb-auto-sales-dms")
4. **Click on "bbb-admin-api"**
5. **Click the "Settings" tab** (at the top)
6. **Scroll down to "Deploy" section**
7. **Find "Start Command" field**
8. **Change it to**: `node index.js`
9. **Click "Save"**

Railway will automatically redeploy.

## What to Check

Also verify these settings while you're there:

- **Root Directory**: Should be `server` (not blank or project root)
- **Start Command**: Should be `node index.js` (not `node exportServer.mjs`)

## Why This is Needed

When you created the service, Railway auto-detected the wrong entry point. The `railway.json` file is correct, but Railway service settings override it. Once you update it in the dashboard, it will work correctly.



