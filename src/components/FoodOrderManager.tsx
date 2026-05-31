'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { formatServiceDate } from '@/lib/time';

interface MinyanRow {
  id: string;
  service_date: string;
  display_time: string;
  minyan_type: string;
  food_order?: {
    id: string;
    prompt: string;
    options: string[];
    responses: { choice: string; member: { first_name: string; last_name: string; role: string } }[];
  } | null;
}

const DEFAULT_PROMPT = 'Slurpee?';
const DEFAULT_OPTIONS = ['Coke', 'Red', 'Blue'];

export function FoodOrderManager({ minyanim }: { minyanim: MinyanRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  async function enable(m: MinyanRow) {
    setBusy(m.id);
    const sb = supabaseBrowser();
    await sb.from('food_orders').insert({
      minyan_id: m.id,
      prompt: DEFAULT_PROMPT,
      options: DEFAULT_OPTIONS
    });
    setBusy(null);
    router.refresh();
  }

  async function disable(orderId: string, minyanId: string) {
    if (!confirm('Cancel this food order? All responses will be lost.')) return;
    setBusy(minyanId);
    const sb = supabaseBrowser();
    await sb.from('food_orders').delete().eq('id', orderId);
    setBusy(null);
    router.refresh();
  }

  async function saveEdit(orderId: string, minyanId: string, prompt: string, optsStr: string) {
    setBusy(minyanId);
    const options = optsStr.split(',').map(s => s.trim()).filter(Boolean);
    const sb = supabaseBrowser();
    await sb.from('food_orders').update({ prompt, options }).eq('id', orderId);
    setBusy(null);
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="px-5 pt-4 space-y-3">
      <p className="text-[11px] text-muted italic">
        Enable a food order on any upcoming minyan. Members will see the question on their commit screen and can choose. Default options: {DEFAULT_OPTIONS.join(', ')}.
      </p>

      {minyanim.length === 0 && (
        <p className="text-sm text-muted italic">No upcoming minyanim.</p>
      )}

      {minyanim.map(m => {
        const day = formatServiceDate(m.service_date, { weekday: 'short', month: 'short', day: 'numeric' });
        const type = m.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv';
        const dim = busy === m.id;
        return (
          <div key={m.id} className="bg-cream-warm border border-black/10 rounded-xl p-3">
            <div className="flex justify-between items-baseline">
              <div>
                <div className="font-serif text-[14px] font-semibold text-ink">{day} {type}</div>
                <div className="text-[11px] text-muted">{m.display_time}</div>
              </div>
              {m.food_order ? (
                <button onClick={() => disable(m.food_order!.id, m.id)} disabled={dim}
                  className="text-[10px] text-alert underline">Cancel order</button>
              ) : (
                <button onClick={() => enable(m)} disabled={dim}
                  className="bg-ink text-cream px-3 py-1.5 rounded-lg text-[11px] font-bold">
                  + Food order
                </button>
              )}
            </div>

            {m.food_order && (
              <OrderDetail
                order={m.food_order}
                minyanId={m.id}
                isEditing={editing === m.food_order.id}
                onEdit={() => setEditing(m.food_order!.id)}
                onCancelEdit={() => setEditing(null)}
                onSave={(p, o) => saveEdit(m.food_order!.id, m.id, p, o)}
                dim={dim}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderDetail({
  order, minyanId, isEditing, onEdit, onCancelEdit, onSave, dim
}: {
  order: { id: string; prompt: string; options: string[]; responses: any[] };
  minyanId: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (prompt: string, optsCsv: string) => void;
  dim: boolean;
}) {
  const [prompt, setPrompt] = useState(order.prompt);
  const [optsStr, setOptsStr] = useState(order.options.join(', '));

  const tally: Record<string, number> = {};
  for (const o of order.options) tally[o] = 0;
  for (const r of order.responses) {
    if (tally[r.choice] === undefined) tally[r.choice] = 0;
    tally[r.choice]++;
  }

  if (isEditing) {
    return (
      <div className="mt-2 pt-2 border-t border-black/10 space-y-2">
        <input value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Prompt (e.g. Slurpee?)"
          className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
        <input value={optsStr} onChange={e => setOptsStr(e.target.value)}
          placeholder="Options, comma-separated"
          className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm font-mono" />
        <div className="flex gap-2">
          <button onClick={() => onSave(prompt, optsStr)} disabled={dim}
            className="btn-primary flex-1">Save</button>
          <button onClick={onCancelEdit} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-black/10">
      <div className="flex justify-between items-baseline mb-1">
        <div className="text-[12px] text-ink font-semibold">{order.prompt}</div>
        <button onClick={onEdit} className="text-[10px] text-muted underline">edit</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {order.options.map(o => (
          <div key={o} className="bg-parchment border border-black/10 rounded-full px-2.5 py-0.5 text-[11px] text-ink font-mono">
            {o}: <strong>{tally[o] || 0}</strong>
          </div>
        ))}
      </div>
      {order.responses.length > 0 ? (
        <div className="text-[10px] text-muted">
          {order.responses
            .map((r: any) => `${r.member.first_name} ${r.member.last_name[0]}. → ${r.choice}`)
            .join('  ·  ')}
        </div>
      ) : (
        <div className="text-[10px] text-muted italic">No responses yet.</div>
      )}
    </div>
  );
}
