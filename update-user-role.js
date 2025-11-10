import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jhymejbyuvavjsywnwjw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoeW1lamJ5dXZhdmpzeXdud2p3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE4NTMxNywiZXhwIjoyMDc3NzYxMzE3fQ.SNb0rJfRhVhRA6N6S0GmKC68xF-8frVXl0gcyJWaV8A',  // keep this secret
  { auth: { persistSession: false } }
);

async function setUserRole() {
  const userId = 'c08a1f92-e3fe-447d-a8cb-d33044697832'; // replace with your user’s UID

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role: 'admin' }
  });

  if (error) {
    console.error('Error updating user:', error);
  } else {
    console.log('Updated user:', data);
  }
}

setUserRole();
