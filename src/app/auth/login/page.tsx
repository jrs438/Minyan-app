'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const cleaned = phone.replace(/[^\d+]/g, '');
    const formatted = cleaned.startsWith('+') ? cleaned : `+1${cleaned}`;

    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/auth/verify?phone=${encodeURIComponent(formatted)}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-gold-deep mb-3">
            Congregation Beth Tefillah · Paramus
          </div>
          <h1 className="font-serif text-4xl text-ink mb-2">Minyan</h1>
          <p className="font-serif italic text-gold-deep text-sm">a companion for the daily ten</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="section-label block">Phone Number</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(201) 555-0123"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-parchment border border-black/10 text-ink text-base focus:outline-none focus:border-gold"
              required
            />
            <p className="text-[11px] text-muted mt-2 italic">
              We'll text you a 6-digit code. US numbers only.
            </p>
          </div>

          {error && (
            <div className="text-sm text-alert bg-alert/10 p-3 rounded-lg">{error}</div>
          )}

          <button type="submit" className="btn-primary" disabled={loading || phone.length < 10}>
            {loading ? 'Sending code…' : 'Continue'}
          </button>
        </form>

        <p className="text-[11px] text-muted text-center mt-8 italic">
          Only members added by the gabbai can sign in. <br />
          Text the gabbai if you need access.
        </p>
      </div>
    </div>
  );
}
