import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

[
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, ".env"),
].forEach((envPath) => {
  dotenv.config({ path: envPath, override: false });
});

console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SERVICE_ROLE:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Configured" : "Missing");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Allow preflight CORS requests to pass through without auth checks (Express 5)
app.options(/.*/, cors(), (_req, res) => res.sendStatus(204));

// Middleware to verify the request is from an authenticated admin
const verifyAdmin = async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Unauthorized: No token provided' } });
  }

  const token = authHeader.substring(7);

  try {
    // Verify the token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: { message: 'Unauthorized: Invalid token' } });
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ error: { message: 'Forbidden: Admin access required' } });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// LIST ALL USERS (Admin only)
app.get("/admin/users", verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      return res.status(500).json({ error });
    }

    // Return users without exposing sensitive data
    const sanitizedUsers = data.users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    }));

    return res.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Error listing users:', error);
    return res.status(500).json({ error: { message: 'Failed to list users' } });
  }
});

// GET USER PERMISSIONS (Admin only)
app.get("/admin/user-permissions/:userId", verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("UserPermissions")
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error });
    }

    return res.json({ permissions: data });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return res.status(500).json({ error: { message: 'Failed to fetch permissions' } });
  }
});

// CREATE USER ENDPOINT (Admin only)
app.post("/admin/create-user", verifyAdmin, async (req, res) => {
  try {
    const { email, password, role, access } = req.body;

    // Validate inputs
    if (!email || !password || !role) {
      return res.status(400).json({
        error: { message: "email, password, and role are required" }
      });
    }

    // 1) Create auth user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role }
    });

    if (userError || !userData?.user) {
      return res.status(500).json({ error: userError || { message: "User creation failed" } });
    }

    const userId = userData.user.id;

    // 2) Insert permissions if provided
    if (access) {
      const { error: permError } = await supabase
        .from("UserPermissions")
        .insert({
          user_id: userId,
          permissions: access
        });

      if (permError) {
        console.error('Error creating permissions:', permError);
        // Don't fail the whole request, just log the error
      }
    }

    return res.json({
      success: true,
      user: {
        id: userId,
        email: userData.user.email,
        role
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: { message: 'Failed to create user' } });
  }
});

// UPDATE USER PERMISSIONS (Admin only)
app.post("/admin/update-user-permissions", verifyAdmin, async (req, res) => {
  try {
    const { user_id, permissions } = req.body;

    if (!user_id || !permissions) {
      return res.status(400).json({
        error: { message: "user_id and permissions are required" }
      });
    }

    const { error } = await supabase
      .from("UserPermissions")
      .upsert(
        {
          user_id,
          permissions
        },
        { onConflict: "user_id" }
      );

    if (error) {
      return res.status(500).json({ error });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating permissions:', error);
    return res.status(500).json({ error: { message: 'Failed to update permissions' } });
  }
});

// GET USER BY ID (Admin only)
app.get("/admin/users/:userId", verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      return res.status(500).json({ error });
    }

    if (!data?.user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    // Return sanitized user data
    const sanitizedUser = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || 'user',
      created_at: data.user.created_at,
      last_sign_in_at: data.user.last_sign_in_at,
    };

    return res.json({ user: sanitizedUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: { message: 'Failed to fetch user' } });
  }
});

// UPDATE USER ROLE (Admin only)
app.patch("/admin/users/:userId", verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: { message: "Valid role ('user' or 'admin') is required" }
      });
    }

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role }
    });

    if (error) {
      return res.status(500).json({ error });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: { message: 'Failed to update user' } });
  }
});

// DELETE USER (Admin only)
app.delete("/admin/users/:userId", verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Delete user from Supabase Auth
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      return res.status(500).json({ error });
    }

    // Permissions will be automatically deleted via CASCADE if set up in DB

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: { message: 'Failed to delete user' } });
  }
});

// START SERVER
const PORT = process.env.PORT || 4100;
app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
