'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function StoreList({ items, balance }: { items: any[]; balance: number }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function redeem(item: any) {
    const cost = Number(item.point_cost);
    if (balance < cost) return;
    if (!confirm(`Redeem "${item.name}" for ${cost} points?`)) return;
    setPending(item.id);
    setError(null);
    const res = await fetch('/api/store/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id })
    });
    const data = await res.json().catch(() => ({}));
    setPending(null);
    if (!res.ok) { setError(data.error || 'Could not redeem. Try again.'); return; }
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted px-1 italic">The store is empty right now — check back soon.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="text-sm text-alert bg-alert/10 p-3 rounded-lg">{error}</div>}
      {items.map(it => {
        const cost = Number(it.point_cost);
        const out = it.stock !== null && it.stock <= 0;
        const cant = balance < cost || out;
        return (
          <div key={it.id} className="flex gap-3 items-center bg-cream-warm border border-black/10 rounded-xl p-3.5">
            <div className="flex-1 min-w-0">
              <div className="font-serif text-[15px] font-semibold text-ink">{it.name}</div>
              {it.description && <div className="text-[11px] text-muted mt-0.5">{it.description}</div>}
              <div className="text-[11px] text-gold-deep font-mono mt-1">
                {cost} pts{it.stock !== null ? ` · ${it.stock} left` : ''}
              </div>
            </div>
            <button
              onClick={() => redeem(it)}
              disabled={cant || pending === it.id}
              className={`px-3.5 py-2 rounded-lg text-[11px] font-semibold tracking-wide ${
                cant ? 'bg-black/5 text-muted' : 'bg-ink text-cream active:scale-[0.98]'
              }`}
            >
              {pending === it.id ? '…' : out ? 'Out' : balance < cost ? 'Need more' : 'Redeem'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
