'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.push('/chat');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-extrabold">E</span>
          </div>
          <h1 className="text-3xl font-extrabold text-text-main">
            Welcome back
          </h1>
          <p className="text-text-secondary mt-1">
            Sign in to continue with Ember
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="Email"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Password"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
          />

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 text-white font-bold text-base disabled:opacity-50 hover:bg-primary-dark transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-text-secondary text-sm mt-1">
            No account?{' '}
            <Link href="/signup" className="text-primary font-bold hover:underline">
              Create one
            </Link>
          </p>
        </form>

        <p className="mt-8 text-center text-xs text-text-muted leading-relaxed">
          This is a supportive tool, not a substitute for professional mental
          health care. In a crisis, call or text{' '}
          <strong className="text-text-main">988</strong>.
        </p>
      </div>
    </div>
  );
}
