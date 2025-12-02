# Admin API Server Deployment Guide

## Current Problem

The admin API server is **not deployed yet**. The URL `bbb-auto-sales-dms-production.up.railway.app` is currently serving the **frontend React app**, not the admin API server.

This is why you're getting:
- 404 errors when accessing `/admin/users`
- HTML responses instead of JSON

## Solution: Deploy Admin API Server as Separate Service

The admin API server needs to be deployed as a **new service** in your "satisfied-patience" Railway project.

### Step-by-Step Instructions

1. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Navigate to your "satisfied-patience" project

2. **Create New Service for Admin API**
   - Click "**New Service**" button
   - Select "**GitHub Repo**" (or "Empty Service" if you prefer)
   - If using GitHub Repo:
     - Select this repository
     - Set **Root Directory** to: `server`
     - Railway will auto-detect the configuration

3. **Configure the Service**
   - Railway should auto-detect `server/package.json`
   - Verify the **Start Command** is: `node index.js`
   - If not, set it manually in service settings

4. **Set Environment Variables**
   - Go to the new service's "Variables" tab
   - Add these required variables:
     ```
     SUPABASE_URL=https://jhymejbyuvavjsywnwjw.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
     TIMEZONE=America/Chicago
     PORT=4100
     ```
   - Copy `SUPABASE_SERVICE_ROLE_KEY` from your existing service

5. **Generate Domain**
   - Go to the service's "Settings" tab
   - Click "**Generate Domain**"
   - This will give you a URL like: `https://bbb-admin-api-production.up.railway.app`

6. **Update Frontend Environment Variable**
   - Go to your **frontend service** (the one that serves the React app)
   - In "Variables" tab, set:
     ```
     VITE_API_URL=https://your-new-admin-api-domain.up.railway.app
     ```
   - Replace with the actual domain from step 5
   - Redeploy the frontend service

7. **Test the Admin API**
   - Test health endpoint: `curl https://your-admin-api-domain/health`
   - Should return: `{"status":"ok"}` or similar

## Alternative: Deploy Admin API to Different Project

If you prefer to keep things completely separate, you can:
1. Create a new Railway project called "bbb-admin-api"
2. Deploy the `server` directory there
3. Update `VITE_API_URL` to point to that project's domain

## Quick Reference

**Current Setup:**
- Frontend: `bbb-auto-sales-dms-production.up.railway.app` (React app)
- Admin API: ❌ Not deployed yet
- Export Server: `bbb-export-server-production.up.railway.app` ✅

**After Fix:**
- Frontend: `bbb-auto-sales-dms-production.up.railway.app` (React app)
- Admin API: `https://your-new-admin-api-domain.up.railway.app` (API server)
- Export Server: `bbb-export-server-production.up.railway.app` ✅

