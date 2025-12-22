# Deploy Admin API Server

The admin API server needs to be deployed as a **separate Railway service** before we can set VITE_API_URL.

## Steps:

1. Go to Railway dashboard: https://railway.app
2. Open the "satisfied-patience" project
3. Click "New Service" → "GitHub Repo" (or "Empty Service")
4. Select this repository
5. Set the **Root Directory** to: `server`
6. Set the **Start Command** to: `node index.js`
7. Add environment variables:
   - `SUPABASE_URL` (copy from existing service)
   - `SUPABASE_SERVICE_ROLE_KEY` (copy from existing service)
   - `PORT=4100` (optional, Railway will assign automatically)
8. Once deployed, generate a domain for the service
9. Update VITE_API_URL to the new service URL

## Current Issue:

- VITE_API_URL is currently set to: `https://bbb-auto-sales-dms-production.up.railway.app` (frontend - WRONG)
- Admin API server needs its own service with its own domain
- Once deployed, we'll set VITE_API_URL to the admin API service URL

