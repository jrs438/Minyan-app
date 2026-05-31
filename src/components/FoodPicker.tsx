'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function FoodPicker({
  foodOrderId,
  memberId,
  prompt,
  options,
  currentChoice
}: {
  foodOrderId: string;
  memberId: string;
  prompt: string;
  options: string[];
  currentChoice: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pick(choice: string) {
    setBusy(true);
    const sb = supabaseBrowser();
    await sb.from('food_order_responses').upsert({
      food_order_id: foodOrderId,
      member_id: memberId,
      choice,
      responded_at: new Date().toISOString()
    }, { onConflict: 'food_order_id,member_id' });
    setBusy(false);
    router.refresh();
  }

  async function clear() {
    setBusy(true);
    const sb = supabaseBrowser();
    await sb.from('food_order_responses').delete()
      .eq('food_order_id', foodOrderId)
      .eq('member_id', memberId);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-6 bg-cream-warm border border-gold rounded-xl p-3.5">
      <div className="flex justify-between items-center mb-2">
        <div className="font-mono text-[9px] tracking-[0.2em] text-gold-deep font-bold">🍧 {prompt.toUpperCase()}</div>
        {currentChoice && (
          <button onClick={clear} disabled={busy}
            className="text-[10px] text-muted underline">No thanks</button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(o => {
          const on = o === currentChoice;
          return (
            <button key={o} onClick={() => pick(o)} disabled={busy}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold ${
                on ? 'bg-ink text-cream' : 'bg-parchment border border-black/10 text-ink'
              }`}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
