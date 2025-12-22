# BBB Auto Sales DMS - Admin API Server

This is the secure backend API server for admin operations. It handles sensitive operations like user management and permissions that require the Supabase service role key.

## Why a separate server?

The service role key bypasses Row Level Security (RLS) and should **never** be exposed in client-side code. This server keeps your service role key secure on the backend.

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `server` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=4100
```

### 3. Run the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:4100`

## API Endpoints

All admin endpoints require authentication. Include the user's auth token in the `Authorization` header:

```
Authorization: Bearer <user_access_token>
```

### `GET /health`
Health check endpoint. Returns server status.

### `GET /admin/users`
List all users (admin only).

### `GET /admin/user-permissions/:userId`
Get permissions for a specific user (admin only).

### `POST /admin/create-user`
Create a new user (admin only).

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "user",
  "access": { ... }
}
```

### `POST /admin/update-user-permissions`
Update user permissions (admin only).

**Body:**
```json
{
  "user_id": "user-id-here",
  "permissions": { ... }
}
```

### `DELETE /admin/users/:userId`
Delete a user (admin only).

## Deployment

### For Local Development

Just run `npm run dev` in the server directory.

### For Production

You can deploy this server to:

1. **Vercel/Netlify Functions** - Convert to serverless functions
2. **Railway/Render** - Deploy as a Node.js app
3. **AWS Lambda/Azure Functions** - Deploy as serverless
4. **Your own VPS** - Run with PM2 or Docker

**Important:** Make sure to set the `VITE_API_URL` environment variable in your client app to point to your deployed server URL.

## Security

- All admin endpoints verify the user's auth token
- Only users with `role: 'admin'` in their user_metadata can access admin endpoints
- The service role key never leaves the server
- CORS is enabled but should be restricted in production

## Troubleshooting

**"Admin Supabase client is not configured"**
- Make sure the `.env` file exists in the `server` directory
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly

**"Failed to load users. Make sure the API server is running."**
- Check that the server is running on port 4100
- Verify the client's `VITE_API_URL` environment variable is set correctly
- Check server logs for errors

**"Unauthorized" or "Forbidden" errors**
- Verify the user is logged in
- Check that the user has `role: 'admin'` in Supabase Auth user_metadata
