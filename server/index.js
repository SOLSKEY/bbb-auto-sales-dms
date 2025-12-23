import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { initSMSScheduler, getSchedulerStats, triggerReminderCheck } from "./smsScheduler.js";
import { sendSMSWithRetry, isTwilioReady } from "./services/twilioService.js";

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
console.log("META_VERIFY_TOKEN:", process.env.META_VERIFY_TOKEN ? "Configured" : "Missing");

const app = express();

// Configure CORS - allow all origins since admin auth provides security
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false
};

// FACEBOOK WEBHOOK ENDPOINT - Must be BEFORE CORS and other middleware
// Facebook webhook verification requires a raw challenge response
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

if (!VERIFY_TOKEN) {
  console.warn('⚠️  META_VERIFY_TOKEN is not set in environment variables!');
}

// GET: Webhook verification (Facebook requires this)
// This MUST return ONLY the challenge string, nothing else
app.get('/api/webhooks/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔔 Facebook webhook verification request:', {
    mode,
    tokenProvided: !!token,
    tokenMatch: token === VERIFY_TOKEN,
    challengeProvided: !!challenge,
    expectedToken: VERIFY_TOKEN ? 'SET' : 'MISSING'
  });

  // Facebook requires: mode=subscribe, token matches, challenge exists
  if (mode === 'subscribe' && token && challenge) {
    if (token === VERIFY_TOKEN) {
      console.log('✅ WEBHOOK_VERIFIED - Returning challenge:', challenge);
      // CRITICAL: Facebook requires ONLY the challenge string as plain text
      // No JSON, no HTML, no extra headers, just the raw challenge
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(String(challenge));
    } else {
      console.log('❌ Token mismatch. Expected:', VERIFY_TOKEN, 'Got:', token);
      return res.status(403).send('Forbidden');
    }
  }
  
  console.log('❌ Missing required parameters:', { mode, hasToken: !!token, hasChallenge: !!challenge });
  return res.status(400).send('Bad Request');
});

// POST: Receive webhook events from Facebook
app.post('/api/webhooks/facebook', express.json(), async (req, res) => {
  try {
    const body = req.body;
    console.log('📨 Facebook webhook event received:', JSON.stringify(body, null, 2));

    // Check if this is a page event
    if (body.object === 'page' || body.object === 'instagram') {
      // Iterate over each entry (there might be multiple if batched)
      for (const entry of body.entry) {
        // Handle Messenger/Instagram Messaging Events
        if (entry.messaging) {
          const webhookEvent = entry.messaging[0];
          console.log('💬 Processing message event:', {
            senderId: webhookEvent.sender?.id,
            messageText: webhookEvent.message?.text?.substring(0, 50),
            timestamp: webhookEvent.timestamp
          });
          await handleMessageEvent(webhookEvent, 'facebook_business');
        }
      }
      console.log('✅ Event processed successfully');
      return res.status(200).send('EVENT_RECEIVED');
    } else {
      console.log('⚠️ Unknown webhook object type:', body.object);
      return res.status(404).send('Not Found');
    }
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// Apply CORS to all routes - but webhook is already defined above
app.use(cors(corsOptions));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Middleware to verify the request is from an authenticated admin
const verifyAdmin = async (req, res, next) => {
  // OPTIONS requests should already be handled by CORS middleware above
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

// Health check endpoint (no auth required)
app.get("/health", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.json({ status: "ok", message: "Server is running", port: process.env.PORT || 4100 });
});

// Explicit OPTIONS handlers for each admin route to ensure CORS works
// Express doesn't support wildcard routes like "/admin/*", so we handle each route explicitly
const handleOptions = (req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
};

app.options("/admin/users", handleOptions);
app.options("/admin/create-user", handleOptions);
app.options("/admin/update-user-permissions", handleOptions);
app.options("/admin/users/:userId", handleOptions);
app.options("/admin/user-permissions/:userId", handleOptions);

// LIST ALL USERS (Admin only)
app.get("/admin/users", verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      return res.status(500).json({ error });
    }

    // Fetch all profiles with usernames and phone numbers in one query
    const userIds = data.users.map(u => u.id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, phone_number")
      .in("id", userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create maps of userId -> username and phone_number for quick lookup
    const usernameMap = new Map();
    const phoneNumberMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        if (profile.username) {
          usernameMap.set(profile.id, profile.username);
        }
        if (profile.phone_number) {
          phoneNumberMap.set(profile.id, profile.phone_number);
        }
      });
    }

    // Return users without exposing sensitive data, including username and phone_number
    const sanitizedUsers = data.users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user',
      username: usernameMap.get(user.id) || null,
      phone_number: phoneNumberMap.get(user.id) || null,
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
    const { email, password, role, access, username } = req.body;

    // Validate inputs
    if (!email || !password || !role) {
      return res.status(400).json({
        error: { message: "email, password, and role are required" }
      });
    }

    // Check username uniqueness if provided
    if (username) {
      const { data: existingUser, error: checkError } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking username uniqueness:', checkError);
        return res.status(500).json({ error: { message: 'Error checking username availability' } });
      }

      if (existingUser) {
        return res.status(400).json({
          error: { message: "Username already exists. Please choose a different username." }
        });
      }
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

    // 2) Create or update profile with username if provided
    if (username) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          username: username,
          role: role
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Error creating/updating profile:', profileError);
        // Don't fail the whole request, just log the error
      }
    }

    // 3) Insert permissions if provided
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
        role,
        username: username || null
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

    // Fetch username and phone_number from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, phone_number")
      .eq("id", data.user.id)
      .maybeSingle();

    // Return sanitized user data
    const sanitizedUser = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || 'user',
      username: profile?.username || null,
      phone_number: profile?.phone_number || null,
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
    const { role, username, phone_number } = req.body;

    // Update role if provided
    if (role) {
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({
          error: { message: "Valid role ('user' or 'admin') is required" }
        });
      }

      const { error: roleError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role }
      });

      if (roleError) {
        return res.status(500).json({ error: roleError });
      }
    }

    // Prepare profile update object
    const profileUpdate = { id: userId };

    // Update username if provided
    if (username !== undefined) {
      // Check username uniqueness (excluding current user)
      if (username) {
        const { data: existingUser, error: checkError } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("username", username)
          .neq("id", userId)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking username uniqueness:', checkError);
          return res.status(500).json({ error: { message: 'Error checking username availability' } });
        }

        if (existingUser) {
          return res.status(400).json({
            error: { message: "Username already exists. Please choose a different username." }
          });
        }
      }

      profileUpdate.username = username || null;
    }

    // Update phone_number if provided
    if (phone_number !== undefined) {
      profileUpdate.phone_number = phone_number || null;
    }

    // Update profile if there are any changes
    if (username !== undefined || phone_number !== undefined) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileUpdate, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return res.status(500).json({ error: { message: 'Failed to update profile' } });
      }
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


// Handle incoming messages from Facebook
async function handleMessageEvent(event, source) {
  const senderId = event.sender.id;
  const messageText = event.message?.text;

  if (!messageText) {
    console.log('⏭️ Skipping non-text message (attachment/sticker)');
    return; // Ignore attachments/stickers for this v1
  }

  console.log(`🔍 Looking up lead for sender: ${senderId}`);

  // Try to find an existing lead with this Sender ID
  // We store the Platform ID (senderId) in the 'phone' column for matching
  const { data: existingLeads } = await supabase
    .from('crm_leads')
    .select('*')
    .eq('phone', senderId)
    .limit(1);

  let leadId;

  if (existingLeads && existingLeads.length > 0) {
    // Lead exists, update them
    leadId = existingLeads[0].id;
    console.log(`✅ Found existing lead: ${leadId}, updating...`);
    await supabase
      .from('crm_leads')
      .update({
        last_message: messageText,
        status: 'contacted',
        sentiment: 'neutral',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);
    console.log(`✅ Lead updated successfully`);
  } else {
    console.log(`🆕 Creating new lead for sender: ${senderId}`);
    // New Lead! Create them.
    // Get the first admin user to assign the lead to
    let fallbackUserId = null;

    try {
      const { data: adminUsers, error: adminError } = await supabase.auth.admin.listUsers();

      if (!adminError && adminUsers && adminUsers.users.length > 0) {
        // Find first admin user
        const adminUser = adminUsers.users.find(
          (u) => u.user_metadata?.role === 'admin'
        );
        fallbackUserId = adminUser?.id || adminUsers.users[0].id;
      }
    } catch (error) {
      console.warn('Could not fetch admin users, trying fallback:', error);
    }

    // Fallback: try to get any user from crm_leads
    if (!fallbackUserId) {
      const { data: userData } = await supabase
        .from('crm_leads')
        .select('user_id')
        .limit(1);
      fallbackUserId = userData?.[0]?.user_id || null;
    }

    if (!fallbackUserId) {
      console.error('No users found to assign lead to.');
      return;
    }

    const { data: newLead, error: insertError } = await supabase
      .from('crm_leads')
      .insert({
        user_id: fallbackUserId,
        source: source,
        name: `New Lead ${senderId.substring(0, 4)}`,
        phone: senderId,
        last_message: messageText,
        status: 'new',
        vehicle: null,
        sentiment: 'neutral',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating new lead:', insertError);
      return;
    }

    if (newLead) {
      leadId = newLead.id;
      console.log(`✅ New lead created: ${leadId}`);
    } else {
      console.error('❌ Failed to create new lead');
      return;
    }
  }

  // Insert the Message
  if (leadId) {
    console.log(`💾 Saving message to database...`);
    const { error: messageError } = await supabase.from('crm_messages').insert({
      lead_id: leadId,
      sender: 'lead',
      content: messageText,
    });
    
    if (messageError) {
      console.error('❌ Error saving message:', messageError);
    } else {
      console.log('✅ Message saved successfully');
    }
  }
}

// ============================================
// SMS SCHEDULER ADMIN ENDPOINTS
// ============================================

// OPTIONS handlers for SMS admin routes
app.options("/admin/sms-scheduler/health", handleOptions);
app.options("/admin/sms-scheduler/logs", handleOptions);
app.options("/admin/sms-scheduler/test", handleOptions);
app.options("/admin/sms-scheduler/trigger", handleOptions);

// GET: SMS Scheduler health check (Admin only)
app.get("/admin/sms-scheduler/health", verifyAdmin, (req, res) => {
  const stats = getSchedulerStats();
  res.json({
    status: "ok",
    scheduler: stats,
    timestamp: new Date().toISOString()
  });
});

// GET: View recent SMS reminder logs (Admin only)
app.get("/admin/sms-scheduler/logs", verifyAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const { data, error } = await supabase
      .from('sms_reminder_logs')
      .select(`
        *,
        calendar_appointments (
          customer_name,
          appointment_time,
          status
        )
      `)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error });
    }

    return res.json({ logs: data });
  } catch (error) {
    console.error('Error fetching SMS logs:', error);
    return res.status(500).json({ error: { message: 'Failed to fetch SMS logs' } });
  }
});

// POST: Send a test SMS (Admin only)
app.post("/admin/sms-scheduler/test", verifyAdmin, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        error: { message: 'phoneNumber and message are required' }
      });
    }

    if (!isTwilioReady()) {
      return res.status(503).json({
        error: { message: 'Twilio is not configured. Check server environment variables.' }
      });
    }

    const result = await sendSMSWithRetry(phoneNumber, message);

    return res.json({ result });
  } catch (error) {
    console.error('Error sending test SMS:', error);
    return res.status(500).json({ error: { message: 'Failed to send test SMS' } });
  }
});

// POST: Manually trigger a reminder check (Admin only)
app.post("/admin/sms-scheduler/trigger", verifyAdmin, async (req, res) => {
  try {
    const { type } = req.body; // 'day_before', 'day_of', or 'one_hour'

    if (!type || !['day_before', 'day_of', 'one_hour'].includes(type)) {
      return res.status(400).json({
        error: { message: "type must be 'day_before', 'day_of', or 'one_hour'" }
      });
    }

    await triggerReminderCheck(type);

    return res.json({
      success: true,
      message: `Triggered ${type} reminder check`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering reminders:', error);
    return res.status(500).json({ error: { message: 'Failed to trigger reminders' } });
  }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 4100;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
  console.log(`Server listening on 0.0.0.0:${PORT}`);
  console.log(`Facebook webhook endpoint: http://localhost:${PORT}/api/webhooks/facebook`);

  // Initialize SMS Scheduler if enabled
  if (process.env.ENABLE_SMS_SCHEDULER === 'true') {
    console.log('');
    initSMSScheduler();
  } else {
    console.log('');
    console.log('[SMS Scheduler] Disabled (set ENABLE_SMS_SCHEDULER=true to enable)');
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
