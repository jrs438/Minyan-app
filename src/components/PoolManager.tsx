'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PoolManager({ pool, recent }: { pool: any; recent: any[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ amount: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deposit() {
    if (!form.amount) return;
    setSaving(true);
    setError(null);
    const res = await fetch('/api/gabbai/pool/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_cents: Math.round(parseFloat(form.amount) * 100),
        note: form.note || null
      })
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Could not save.'); return; }
    setForm({ amount: '', note: '' });
    router.refresh();
  }

  const balance = pool?.balance_cents ? (pool.balance_cents / 100) : 0;

  return (
    <div className="px-5 pt-4">
      <div className="bg-cream-warm border border-black/10 rounded-xl p-4 mb-6">
        <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold-deep">Current balance</div>
        <div className="font-serif text-3xl font-semibold text-ink mt-1">
          ${balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </div>
        {pool?.total_sponsors > 0 && (
          <div className="text-[11px] text-muted mt-1">
            {pool.total_sponsors} contribution{pool.total_sponsors === 1 ? '' : 's'} · ${(pool.total_contributed_cents / 100).toFixed(0)} total in
          </div>
        )}
      </div>

      <div className="section-label">Record a manual donation</div>
      <div className="bg-cream-warm border border-black/10 rounded-xl p-4 mb-6 space-y-2">
        <input
          placeholder="Amount ($)"
          inputMode="decimal"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, '') })}
          className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm"
        />
        <input
          placeholder="Note (e.g. 'Check from S. Cohen')"
          value={form.note}
          onChange={e => setForm({ ...form, note: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm"
        />
        {error && <div className="text-sm text-alert">{error}</div>}
        <button onClick={deposit} disabled={saving || !form.amount} className="btn-primary">
          {saving ? 'Saving…' : 'Add to pool'}
        </button>
      </div>

      <div className="section-label">Recent contributions</div>
      {recent.length === 0 && <p className="text-sm text-muted italic">No contributions yet.</p>}
      {recent.map((s) => (
        <div key={s.id} className="flex justify-between items-center py-2.5 border-b border-black/5">
          <div className="min-w-0 pr-3">
            <div className="text-[13px] text-ink truncate">
              {s.notes || (s.stripe_payment_intent_id ? 'Stripe payment' : 'Manual deposit')}
            </div>
            <div className="text-[10px] text-muted">
              {new Date(s.paid_at || s.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York'
              })}
            </div>
          </div>
          <div className="font-mono text-[13px] font-semibold text-ink whitespace-nowrap">
            ${(s.amount_cents / 100).toFixed(0)}
          </div>
        </div>
      ))}
    </div>
  );
}
