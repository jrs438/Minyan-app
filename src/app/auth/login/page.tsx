'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Mode = 'magic' | 'password' | 'phone';

function LoginForm() {
  const params = useSearchParams();
  // Back-compat: an old SMS invite link with ?phone= drops the user straight
  // into the phone tab. New email invites use ?email=.
  const initialMode: Mode = params.get('phone') ? 'phone' : 'magic';
  const [mode, setMode] = useState<Mode>(initialMode);

  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(params.get('phone') || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const router = useRouter();

  function pickMode(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const sb = supabaseBrowser();

    if (mode === 'magic') {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setInfo('Check your email — we just sent a sign-in link. Tap it to come back signed in.');
      return;
    }

    if (mode === 'password') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { setLoading(false); setError(error.message); return; }
      const res = await fetch('/api/auth/link', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!data.ok) {
        await sb.auth.signOut();
        setError(
          data.reason === 'inactive' ? 'Your membership is inactive. Text the gabbai.' :
          data.reason === 'not_registered' ? "This email isn't registered. Text the gabbai." :
          'Sign-in error. Please try again.'
        );
        return;
      }
      router.push('/home');
      router.refresh();
      return;
    }

    // phone
    const cleaned = phone.replace(/[^\d+]/g, '');
    const formatted = cleaned.startsWith('+') ? cleaned : `+1${cleaned}`;
    const { error } = await sb.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push(`/auth/verify?phone=${encodeURIComponent(formatted)}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-gold-deep mb-3">
            Congregation Beth Tefillah · Paramus
          </div>
          <h1 className="font-serif text-4xl text-ink mb-2">Minyan</h1>
          <p className="font-serif italic text-gold-deep text-sm">a companion for the daily ten</p>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-cream-warm border border-black/10 rounded-lg p-1 mb-4 text-[11px] font-semibold">
          <Tab on={mode === 'magic'} onClick={() => pickMode('magic')}>Email link</Tab>
          <Tab on={mode === 'password'} onClick={() => pickMode('password')}>Password</Tab>
          <Tab on={mode === 'phone'} onClick={() => pickMode('phone')}>Phone</Tab>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {(mode === 'magic' || mode === 'password') && (
            <div>
              <label className="section-label block">Email</label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="[email protected]"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-parchment border border-black/10 text-ink text-base focus:outline-none focus:border-gold"
                required
              />
            </div>
          )}

          {mode === 'password' && (
            <div>
              <label className="section-label block">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-parchment border border-black/10 text-ink text-base focus:outline-none focus:border-gold"
                required
                minLength={6}
              />
            </div>
          )}

          {mode === 'phone' && (
            <div>
              <label className="section-label block">Phone Number</label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(201) 555-0123"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-parchment border border-black/10 text-ink text-base focus:outline-none focus:border-gold"
                required
              />
              <p className="text-[11px] text-muted mt-2 italic">
                We'll text you a 6-digit code. US numbers only.
              </p>
            </div>
          )}

          {info && <div className="text-sm text-ink bg-gold/15 p-3 rounded-lg">{info}</div>}
          {error && <div className="text-sm text-alert bg-alert/10 p-3 rounded-lg">{error}</div>}

          <button type="submit" className="btn-primary" disabled={
            loading ||
            (mode === 'magic' && !email) ||
            (mode === 'password' && (!email || password.length < 6)) ||
            (mode === 'phone' && phone.length < 10)
          }>
            {loading
              ? (mode === 'phone' ? 'Sending code…' : mode === 'password' ? 'Signing in…' : 'Sending link…')
              : (mode === 'phone' ? 'Continue' : mode === 'password' ? 'Sign in' : 'Send sign-in link')}
          </button>

          {mode === 'password' && (
            <p className="text-[11px] text-muted text-center italic">
              No password yet? Use the <button type="button" onClick={() => pickMode('magic')} className="underline">email link</button> tab, then set a password from your profile.
            </p>
          )}
        </form>

        <p className="text-[11px] text-muted text-center mt-8 italic">
          Only members added by the gabbai can sign in. <br />
          Text the gabbai if you need access.
        </p>
      </div>
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`py-2 rounded text-center ${on ? 'bg-ink text-cream' : 'text-ink-light'}`}>
      {children}
    </button>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
