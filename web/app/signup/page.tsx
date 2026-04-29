'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signUp({
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
            Create account
          </h1>
          <p className="text-text-secondary mt-1">
            Start your CBT journey with Ember
          </p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-3">
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
            placeholder="Password (6+ characters)"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
          />
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(''); }}
            placeholder="Confirm password"
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-text-secondary text-sm mt-1">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign in
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
