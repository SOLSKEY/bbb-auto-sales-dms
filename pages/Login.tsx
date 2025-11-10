import React, { FormEvent, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

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
                navigate('/dashboard', { replace: true });
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
                // Redirect to dashboard after successful login
                navigate('/dashboard', { replace: true });
                onSuccess?.();
            }
        } catch (err: any) {
            setError(err.message ?? 'Unable to sign in. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen spotlight-bg flex items-center justify-center px-4 py-12 text-primary">
            <section className="w-full max-w-lg glass-card border border-border-low rounded-[32px] bg-[#0f0f11]/95 p-10 shadow-2xl">
                <div className="mb-10 text-center space-y-3">
                    <p className="text-[11px] uppercase tracking-[0.4em] text-muted">Sign In</p>
                    <h2 className="text-4xl font-orbitron font-semibold text-primary">
                        Welcome Back{' '}
                        <span className="bg-gradient-to-r from-lava-core via-lava-warm to-lava-core/80 bg-clip-text text-transparent">
                            Commander
                        </span>
                    </h2>
                    <p className="text-sm text-secondary">Use your Supabase-issued email and password to continue.</p>
                    <span className="mx-auto block h-1 w-16 rounded-full bg-gradient-to-r from-lava-core via-lava-warm to-lava-core/80"></span>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                        <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                            Email
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={event => setEmail(event.target.value)}
                                className="mt-2 w-full rounded-2xl border border-border-low/70 bg-[#0c0f13] px-4 py-3 text-primary placeholder:text-muted focus:border-lava-core focus:outline-none focus:ring-2 focus:ring-lava-core/30"
                                placeholder="you@dealership.com"
                            />
                        </label>

                        <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                            Password
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                                className="mt-2 w-full rounded-2xl border border-border-low/70 bg-[#0c0f13] px-4 py-3 text-primary placeholder:text-muted focus:border-lava-core focus:outline-none focus:ring-2 focus:ring-lava-core/30"
                                placeholder="••••••••"
                            />
                        </label>

                        <label className="flex items-center gap-3 text-sm text-secondary">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border border-border-low bg-transparent text-lava-core focus:ring-lava-core/50"
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
                        className="w-full rounded-2xl border border-white/25 bg-[#151515] px-6 py-3 text-base font-semibold text-primary transition hover:border-lava-core hover:text-white focus:outline-none focus:ring-2 focus:ring-lava-core/40 disabled:opacity-60"
                    >
                        {isSubmitting ? 'Signing in…' : 'Access Dashboard'}
                    </button>
                </form>

                {isLoadingSession && (
                    <p className="mt-4 text-center text-xs text-muted">Checking session…</p>
                )}

                <p className="mt-8 text-center text-xs text-secondary">
                    Need access? Contact your platform administrator.
                </p>
            </section>
        </main>
    );
};

export default Login;
