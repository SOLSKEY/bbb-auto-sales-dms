# Export Server Environment Variables Setup

## Current Status

✅ **Export server is running successfully on Railway!**
- Server is deployed at: `bbb-export-server-production.up.railway.app`
- Server is listening on port 4100
- Endpoints are available:
  - `POST /api/export-sales-report`
  - `POST /api/shortcut-screenshot`

❌ **Missing Environment Variables:**
The export server needs the following environment variables to be set in Railway:

## Required Environment Variables

### 1. `APP_URL` (REQUIRED)
**Purpose:** The production URL of your frontend application (deployed on Netlify)

**How to find it:**
- Check your Netlify dashboard
- Look for your site URL (e.g., `https://your-app-name.netlify.app`)
- Or check your Netlify site settings

**Set in Railway:**
1. Go to Railway dashboard: https://railway.app
2. Select the **"bbb-export-server"** project
3. Go to the **Variables** tab
4. Add new variable:
   - **Key:** `APP_URL`
   - **Value:** `https://your-netlify-site.netlify.app` (replace with your actual Netlify URL)

### 2. `SHORTCUT_EMAIL` (REQUIRED for shortcut automation)
**Purpose:** Email address for logging into the app via Puppeteer

**Set in Railway:**
- **Key:** `SHORTCUT_EMAIL`
- **Value:** Your login email address

### 3. `SHORTCUT_PASSWORD` (REQUIRED for shortcut automation)
**Purpose:** Password for logging into the app via Puppeteer

**Set in Railway:**
- **Key:** `SHORTCUT_PASSWORD`
- **Value:** Your login password

## Current Error

The export server is currently failing with:
```
❌ APP_URL environment variable is required in production
```

And when you try to use the shortcut button, you get:
```
Navigation timeout of 60000 ms exceeded
```

This happens because:
1. `APP_URL` is not set, so Puppeteer tries to navigate to `http://localhost:4100/sales` (which doesn't exist)
2. The server can't find your production frontend to take screenshots

## Quick Fix Steps

1. **Find your Netlify URL:**
   - Go to https://app.netlify.com
   - Find your site
   - Copy the site URL (e.g., `https://bbb-auto-sales-dms.netlify.app`)

2. **Set environment variables in Railway:**
   - Go to https://railway.app
   - Select **"bbb-export-server"** project
   - Click **Variables** tab
   - Add these three variables:
     ```
     APP_URL=https://your-netlify-site.netlify.app
     SHORTCUT_EMAIL=your-email@example.com
     SHORTCUT_PASSWORD=your-password
     ```

3. **Redeploy (if needed):**
   - Railway will automatically redeploy when you add environment variables
   - Or manually trigger a redeploy from the Railway dashboard

## Verification

After setting the variables, check the Railway logs. You should see:
```
🚀 Export server running on port 4100
🔗 App URL: https://your-netlify-site.netlify.app
📄 Target page: https://your-netlify-site.netlify.app/sales
💡 Running in production mode
```

Instead of:
```
💡 Running in development mode
🔗 App URL: http://localhost:4100
```

## Security Note

⚠️ **Important:** The `SHORTCUT_PASSWORD` is stored as plain text in Railway environment variables. Make sure:
- Only authorized people have access to your Railway account
- Consider using a dedicated service account with limited permissions
- Regularly rotate the password if needed

