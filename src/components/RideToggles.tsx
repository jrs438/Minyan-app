'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function RideToggles({
  memberId,
  initialNeeds,
  initialOffers,
  neighborhood
}: {
  memberId: string;
  initialNeeds: boolean;
  initialOffers: boolean;
  neighborhood: string | null;
}) {
  const [needs, setNeeds] = useState(initialNeeds);
  const [offers, setOffers] = useState(initialOffers);
  const router = useRouter();

  async function update(field: 'needs_ride_default' | 'offers_ride_default', value: boolean) {
    const sb = supabaseBrowser();
    await sb.from('members').update({ [field]: value }).eq('id', memberId);
    router.refresh();
  }

  return (
    <div className="bg-cream-warm border border-black/5 rounded-xl p-4">
      <Row
        label="I need a ride tomorrow"
        on={needs}
        onChange={v => { setNeeds(v); update('needs_ride_default', v); }}
      />
      <div className="border-t border-black/5 my-1" />
      <Row
        label="I can offer a ride tomorrow"
        on={offers}
        onChange={v => { setOffers(v); update('offers_ride_default', v); }}
      />
      <div className="text-[10px] text-muted mt-2 italic">
        Neighborhood: {neighborhood || 'Not set — edit in Profile'}
      </div>
    </div>
  );
}

function Row({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex justify-between items-center w-full py-2 text-[13px] text-ink"
    >
      <span>{label}</span>
      <div
        className={`w-10 h-6 rounded-full relative transition-colors ${
          on ? 'bg-ok' : 'bg-black/15'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
            on ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </div>
    </button>
  );
}
