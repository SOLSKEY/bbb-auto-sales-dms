'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import CRMInterface from '@/components/crm/CRMInterface';

export default function CRMPage() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initSupabase = async () => {
      try {
        const client = getBrowserSupabaseClient();
        setSupabase(client);

        const {
          data: { session },
        } = await client.auth.getSession();

        if (!session) {
          router.push('/login');
          return;
        }

        setUserId(session.user.id);
        setLoading(false);
      } catch (error) {
        console.error('Error initializing CRM:', error);
        router.push('/login');
      }
    };

    initSupabase();
  }, [router]);

  if (loading || !supabase || !userId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading CRM...</div>
      </div>
    );
  }

  return <CRMInterface supabase={supabase} userId={userId} />;
}

