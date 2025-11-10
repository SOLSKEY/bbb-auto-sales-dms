'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseClient';

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = getBrowserSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) router.replace('/dashboard');
    };
    checkSession();
  }, [router]);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'unauthorized') {
      setError('You do not have permission to access that page.');
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = getBrowserSupabaseClient({ persistSession: rememberMe });
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { shouldCreateUser: false },
      });

      if (signInError) throw signInError;
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl">
        <header className="mb-8 space-y-2 text-center">
          <h1 className="text-3xl font-bold text-white">Dealer DMS</h1>
          <p className="text-sm text-slate-300">Admin-created users only.</p>
        </header>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-200">
            Email
            <input
              required
              type="email"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              placeholder="you@dealership.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            Password
            <input
              required
              type="password"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 accent-amber-400"
            />
            Remember me (persistent session on this device)
          </label>

          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-amber-500 py-2 text-base font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Need an account? Contact an admin to create one for you.
        </p>
      </div>
    </main>
  );
};

export default LoginPage;
