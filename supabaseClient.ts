import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://jhymejbyuvavjsywnwjw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoeW1lamJ5dXZhdmpzeXdud2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODUzMTcsImV4cCI6MjA3Nzc2MTMxN30.xes0mX07AkVwP1RHNfBehxUOpvslP3Q_y_jUi-2aFm0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        headers: {
            'x-client-info': 'bbb-auto-sales-dms',
        },
    },
});

const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const adminSupabase = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
          auth: {
              autoRefreshToken: false,
              persistSession: false,
          },
          global: {
              headers: {
                  'x-client-info': 'bbb-auto-sales-dms-admin',
              },
          },
      })
    : null;
