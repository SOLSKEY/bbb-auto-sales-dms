'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import CRMInterface from '../components/crm/CRMInterface';

const CRM: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initSupabase = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          navigate('/login');
          return;
        }

        setUserId(session.user.id);
        setLoading(false);
      } catch (error) {
        console.error('Error initializing CRM:', error);
        navigate('/login');
      }
    };

    initSupabase();
  }, [navigate]);

  if (loading || !userId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading CRM...</div>
      </div>
    );
  }

  return <CRMInterface supabase={supabase} userId={userId} />;
};

export default CRM;




