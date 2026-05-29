'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

function VerifyForm() {
  const params = useSearchParams();
  const phone = params.get('phone') || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.verifyOtp({ phone, token: code, type: 'sms' });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Link this phone to its member row (server-side, bypassing RLS).
    const res = await fetch('/api/auth/link', { method: 'POST' });
    const result = await res.json().catch(() => ({ ok: false }));
    if (!result.ok) {
      await sb.auth.signOut();
      setError(
        result.reason === 'inactive'
          ? 'Your membership is inactive. Text the gabbai to be reactivated.'
          : result.reason === 'not_registered'
          ? "This phone isn't registered. Text the gabbai to be added."
          : 'Could not sign you in. Please try again.'
      );
      setLoading(false);
      return;
    }
    router.push('/home');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl text-ink mb-2">Enter code</h1>
          <p className="text-sm text-ink-light">Texted to <strong>{phone}</strong></p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full px-4 py-4 rounded-xl bg-parchment border border-black/10 text-ink text-2xl font-mono text-center tracking-[0.4em] focus:outline-none focus:border-gold"
            required
          />
          {error && <div className="text-sm text-alert bg-alert/10 p-3 rounded-lg">{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading || code.length !== 6}>
            {loading ? 'Verifying…' : 'Sign in'}
          </button>
          <button type="button" onClick={() => router.push('/auth/login')}
            className="w-full text-sm text-muted underline">
            Use a different number
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
