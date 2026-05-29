'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { nyWallClockToUTC } from '@/lib/time';

export function RaffleManager({ raffles }: { raffles: any[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ prize: '', period_start: '', period_end: '', prize_value: '' });
  const [saving, setSaving] = useState(false);
  const [drawing, setDrawing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!form.prize || !form.period_start || !form.period_end) return;
    setSaving(true);
    setError(null);
    const sb = supabaseBrowser();
    const { error } = await sb.from('raffles').insert({
      prize: form.prize,
      prize_value_cents: form.prize_value ? Math.round(parseFloat(form.prize_value) * 100) : null,
      period_start: nyWallClockToUTC(form.period_start, 0, 0).toISOString(),
      period_end: nyWallClockToUTC(form.period_end, 23, 59).toISOString()
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setForm({ prize: '', period_start: '', period_end: '', prize_value: '' });
    router.refresh();
  }

  async function draw(id: string) {
    if (!confirm('Draw the winner now? This cannot be undone.')) return;
    setDrawing(id);
    setError(null);
    const res = await fetch('/api/gabbai/raffle/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raffle_id: id })
    });
    const data = await res.json().catch(() => ({}));
    setDrawing(null);
    if (!res.ok) { setError(data.error || 'Could not draw winner.'); return; }
    router.refresh();
  }

  return (
    <div className="px-5 pt-4">
      {error && <div className="text-sm text-alert bg-alert/10 p-3 rounded-lg mb-3">{error}</div>}

      <div className="section-label">New raffle</div>
      <div className="bg-cream-warm border border-black/10 rounded-xl p-4 mb-6 space-y-2">
        <input placeholder="Prize (e.g. iPad mini)" value={form.prize}
          onChange={e => setForm({ ...form, prize: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
        <input placeholder="Approx. value $ (optional)" inputMode="decimal" value={form.prize_value}
          onChange={e => setForm({ ...form, prize_value: e.target.value.replace(/[^\d.]/g, '') })}
          className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wider text-muted">Start</label>
            <input type="date" value={form.period_start}
              onChange={e => setForm({ ...form, period_start: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wider text-muted">End</label>
            <input type="date" value={form.period_end}
              onChange={e => setForm({ ...form, period_end: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
          </div>
        </div>
        <button onClick={create} disabled={saving || !form.prize || !form.period_start || !form.period_end} className="btn-primary">
          {saving ? 'Saving…' : 'Create raffle'}
        </button>
      </div>

      <div className="section-label">Raffles</div>
      {raffles.length === 0 && <p className="text-sm text-muted italic">No raffles yet.</p>}
      {raffles.map(r => {
        const closed = new Date(r.period_end) < new Date();
        const drawn = !!r.drawn_at;
        const winner = (r.winner as any);
        return (
          <div key={r.id} className="py-3 border-b border-black/5">
            <div className="flex justify-between items-baseline">
              <div className="font-serif text-[15px] font-semibold text-ink">{r.prize}</div>
              <div className="text-[10px] text-muted">
                {drawn ? '✓ drawn' : closed ? 'closed — ready to draw' : 'open'}
              </div>
            </div>
            <div className="text-[11px] text-muted">
              {new Date(r.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })} → {new Date(r.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}
              {r.prize_value_cents ? ` · ~$${(r.prize_value_cents / 100).toFixed(0)}` : ''}
            </div>
            {drawn && winner && (
              <div className="text-[12px] text-gold-deep font-semibold mt-1">
                Winner: {winner.first_name} {winner.last_name}
              </div>
            )}
            {closed && !drawn && (
              <button onClick={() => draw(r.id)} disabled={drawing === r.id}
                className="mt-2 px-3 py-1.5 rounded-lg bg-ink text-cream text-[11px] font-semibold">
                {drawing === r.id ? 'Drawing…' : 'Draw winner'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
