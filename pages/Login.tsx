import React, { FormEvent, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ShaderBackground from '../components/ui/shader-background';

interface LoginProps {
    onSuccess?: () => void;
    isLoadingSession?: boolean;
}

const Login: React.FC<LoginProps> = ({ onSuccess, isLoadingSession = false }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check if user is already logged in
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/sales', { replace: true });
            }
        };
        checkSession();
    }, [navigate]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        setError(null);
        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
                options: {
                    shouldCreateUser: false,
                },
            });

            if (signInError) {
                throw signInError;
            }

            // If the user chose not to be remembered, remove any persisted token from storage.
            if (!rememberMe) {
                const storageKey = (supabase.auth as any).storageKey;
                if (storageKey) {
                    await supabase.auth?.storage?.removeItem(storageKey);
                }
            }

            if (data.session) {
                // Redirect to sales after successful login
                navigate('/sales', { replace: true });
                onSuccess?.();
            }
        } catch (err: any) {
            setError(err.message ?? 'Unable to sign in. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen relative flex items-center justify-center px-4 py-12 text-white">
            <ShaderBackground />
            <section className="w-full max-w-lg relative border border-cyan-500/30 rounded-[32px] bg-[#0f0f11]/40 backdrop-blur-xl p-10 shadow-2xl">
                <div className="mb-10 text-center space-y-3">
                    <p className="text-[11px] uppercase tracking-[0.4em] text-white">Sign In</p>
                    <h2 className="text-4xl font-orbitron font-semibold text-white leading-tight">
                        Welcome Back to
                        <br />
                        <span 
                            className="text-6xl font-bold"
                            style={{
                                background: 'linear-gradient(to right, #67e8f9, #22d3ee, #06b6d4, #3b82f6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            BBB HQ
                        </span>
                        <br />
                        Commander
                    </h2>
                    <p className="text-sm text-white">Use your Supabase-issued email and password to continue.</p>
                    <span className="mx-auto block h-1 w-16 rounded-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400"></span>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                        <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-white">
                            Email
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={event => setEmail(event.target.value)}
                                className="mt-2 w-full rounded-2xl border border-cyan-500/30 bg-[#0c0f13]/80 px-4 py-3 text-white placeholder:text-white/60 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                placeholder="you@dealership.com"
                            />
                        </label>

                        <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-white">
                            Password
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                                className="mt-2 w-full rounded-2xl border border-cyan-500/30 bg-[#0c0f13]/80 px-4 py-3 text-white placeholder:text-white/60 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                placeholder="••••••••"
                            />
                        </label>

                        <label className="flex items-center gap-3 text-sm text-white">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border border-cyan-500/50 bg-transparent text-cyan-500 focus:ring-cyan-500/50 accent-cyan-500"
                                checked={rememberMe}
                                onChange={event => setRememberMe(event.target.checked)}
                            />
                            Keep me signed in on this device
                        </label>

                        {error && (
                            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {error}
                            </p>
                        )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-2xl border border-cyan-500/50 bg-[#151515]/80 px-6 py-3 text-base font-semibold text-white transition hover:border-cyan-400 hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-60"
                    >
                        {isSubmitting ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                {isLoadingSession && (
                    <p className="mt-4 text-center text-xs text-white">Checking session…</p>
                )}

                <p className="mt-8 text-center text-xs text-white">
                    Need access? Contact your platform administrator.
                </p>
            </section>
        </main>
    );
};

export default Login;
