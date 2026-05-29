'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function StoreManager({ items, pending }: { items: any[]; pending: any[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', point_cost: '', description: '', stock: '' });
  const [saving, setSaving] = useState(false);

  async function addItem() {
    if (!form.name || !form.point_cost) return;
    setSaving(true);
    const sb = supabaseBrowser();
    await sb.from('store_items').insert({
      name: form.name,
      point_cost: Number(form.point_cost),
      description: form.description || null,
      stock: form.stock === '' ? null : Number(form.stock)
    });
    setSaving(false);
    setForm({ name: '', point_cost: '', description: '', stock: '' });
    router.refresh();
  }

  async function toggleActive(it: any) {
    const sb = supabaseBrowser();
    await sb.from('store_items').update({ active: !it.active }).eq('id', it.id);
    router.refresh();
  }

  async function markGiven(r: any) {
    const sb = supabaseBrowser();
    await sb.from('store_redemptions').update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() }).eq('id', r.id);
    router.refresh();
  }

  return (
    <div className="px-5 pt-4">
      {pending.length > 0 && (
        <>
          <div className="section-label">To hand over ({pending.length})</div>
          <div className="mb-6">
            {pending.map(r => (
              <div key={r.id} className="flex justify-between items-center py-2.5 border-b border-black/5">
                <div>
                  <div className="text-[13px] font-semibold text-ink">{r.item_name}</div>
                  <div className="text-[11px] text-muted">
                    {r.members ? `${r.members.first_name} ${r.members.last_name}` : 'Member'} · {Number(r.points_spent)} pts
                  </div>
                </div>
                <button onClick={() => markGiven(r)}
                  className="px-3 py-1.5 rounded-lg bg-ink text-cream text-[11px] font-semibold">
                  Mark given
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-label">Add item</div>
      <div className="bg-cream-warm border border-black/10 rounded-xl p-4 mb-6 space-y-2">
        <input placeholder="Item name (e.g. $10 Amazon gift card)" value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
        <input placeholder="Description (optional)" value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
        <div className="flex gap-2">
          <input placeholder="Point cost" inputMode="decimal" value={form.point_cost}
            onChange={e => setForm({ ...form, point_cost: e.target.value.replace(/[^\d.]/g, '') })}
            className="flex-1 px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
          <input placeholder="Stock (blank = ∞)" inputMode="numeric" value={form.stock}
            onChange={e => setForm({ ...form, stock: e.target.value.replace(/[^\d]/g, '') })}
            className="flex-1 px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
        </div>
        <button onClick={addItem} disabled={saving || !form.name || !form.point_cost} className="btn-primary">
          {saving ? 'Adding…' : 'Add to store'}
        </button>
      </div>

      <div className="section-label">Items ({items.length})</div>
      {items.map(it => (
        <div key={it.id} className="flex justify-between items-center py-2.5 border-b border-black/5">
          <div>
            <div className={`text-[13px] font-semibold ${it.active ? 'text-ink' : 'text-muted line-through'}`}>
              {it.name}
            </div>
            <div className="text-[11px] text-muted">
              {Number(it.point_cost)} pts{it.stock !== null ? ` · ${it.stock} left` : ' · ∞'}
            </div>
          </div>
          <button onClick={() => toggleActive(it)} className="text-[11px] text-muted underline">
            {it.active ? 'hide' : 'show'}
          </button>
        </div>
      ))}
    </div>
  );
}
