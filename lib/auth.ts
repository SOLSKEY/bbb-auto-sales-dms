import { getServerSupabaseClient } from '@/lib/supabaseClient';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: 'admin' | 'basic_user';
};

/**
 * Loads the active session and normalizes role data so pages/middleware can make
 * authorization decisions. By default we look in Supabase app_metadata. Update
 * this helper later if you store roles in a dedicated table.
 */
export const getSessionUserWithRole = async (): Promise<AuthenticatedUser | null> => {
  const supabase = await getServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const role = (session.user.app_metadata?.role as AuthenticatedUser['role'] | undefined) ?? 'basic_user';

  return {
    id: session.user.id,
    email: session.user.email ?? 'unknown-user',
    role,
  };
};
