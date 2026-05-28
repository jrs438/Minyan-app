'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Row {
  memberId: string;
  name: string;
  initials: string;
  role: string;
  isTeen: boolean;
  status: string;
  needsRide: boolean;
  checkedIn: boolean;
}

export function GabbaiRoster({ minyanId, roster }: { minyanId: string; roster: Row[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function toggle(r: Row) {
    if (r.checkedIn) return; // gabbai cannot un-check from the UI (keeps audit clean)
    setLoading(r.memberId);
    await fetch('/api/gabbai/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minyan_id: minyanId, member_id: r.memberId })
    });
    setLoading(null);
    router.refresh();
  }

  if (roster.length === 0) {
    return <div className="text-sm text-muted italic py-3">No commitments yet.</div>;
  }

  return (
    <div className="space-y-0">
      {roster.map(r => (
        <button
          key={r.memberId}
          onClick={() => toggle(r)}
          disabled={r.checkedIn || loading === r.memberId}
          className="flex items-center w-full gap-2.5 py-2.5 border-b border-black/5 active:bg-black/5 text-left"
        >
          <div className={`w-[18px] h-[18px] rounded flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
            r.checkedIn ? 'bg-ok text-white' : 'border-[1.5px] border-black/15'
          }`}>
            {r.checkedIn && '✓'}
          </div>
          <div className="w-8 h-8 rounded-full bg-cream-warm border border-black/10 flex items-center justify-center text-[11px] font-semibold">
            {r.initials}
          </div>
          <div className="flex-1 min-w-0 text-[12px] text-ink">
            {r.name}
            {r.isTeen && <em className="text-gold-deep text-[9px] ml-1">· teen</em>}
          </div>
          <div className="text-[9px] text-right">
            {loading === r.memberId ? (
              <span className="text-muted italic">saving…</span>
            ) : r.status === 'yes' ? (
              <span className="text-ok">committed</span>
            ) : r.status === 'maybe' ? (
              <span className="text-amber">maybe</span>
            ) : (
              <span className="text-alert">out</span>
            )}
            {r.needsRide && <div className="text-amber">needs ride</div>}
          </div>
        </button>
      ))}
    </div>
  );
}
