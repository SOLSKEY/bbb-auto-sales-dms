'use client';

import { cookies } from 'next/headers';
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  type SupabaseClient,
} from '@supabase/auth-helpers-nextjs';

/**
 * Replace this Database type with your generated types if available.
 */
type Database = Record<string, never>;

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};

export const getBrowserSupabaseClient = ({
  persistSession = true,
}: { persistSession?: boolean } = {}): SupabaseClient<Database> => {
  return createBrowserSupabaseClient<Database>({
    ...config,
    options: {
      auth: {
        persistSession,
        detectSessionInUrl: true,
      },
    },
  });
};

export const getServerSupabaseClient = async (): Promise<SupabaseClient<Database>> => {
  return createServerSupabaseClient<Database>({ cookies });
};
