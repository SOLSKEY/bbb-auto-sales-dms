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
console.log("SERVICE_ROLE:", process.env.SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CREATE USER ENDPOINT
app.post("/create-user", async (req, res) => {
  const { email, password, role, access } = req.body;

  // 1) create auth user
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role }
  });

  if (userError || !userData?.user) {
    return res.json({ error: userError || new Error("User creation failed.") });
  }

  const userId = userData.user.id;

  // 2) insert permissions
  const { error: permError } = await supabase
    .from("UserPermissions")
    .insert({
      user_id: userId,
      permissions: access
    });

  if (permError) {
    return res.json({ error: permError });
  }

  return res.json({ success: true });
});

app.post("/update-user-permissions", async (req, res) => {
  const { user_id, permissions } = req.body;

  if (!user_id || !permissions) {
    return res.status(400).json({ error: { message: "user_id and permissions are required." } });
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
    return res.json({ error });
  }

  return res.json({ success: true });
});

// START SERVER
app.listen(4100, () => {
  console.log("SERVER RUNNING ON PORT 4100");
});
