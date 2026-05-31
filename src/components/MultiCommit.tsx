'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { formatServiceDate } from '@/lib/time';
import type { UpcomingMinyan } from '@/lib/types';

interface Commit {
  minyan_id: string;
  status: 'yes' | 'no' | 'maybe';
  needs_ride: boolean;
}

export function MultiCommit({
  minyanim,
  myCommits,
  memberId
}: {
  minyanim: UpcomingMinyan[];
  myCommits: Commit[];
  memberId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const commitMap = new Map(myCommits.map(c => [c.minyan_id, c]));

  async function upsert(minyanId: string, patch: Partial<Commit>) {
    setBusy(minyanId);
    const existing = commitMap.get(minyanId);
    const sb = supabaseBrowser();
    await sb.from('commitments').upsert({
      member_id: memberId,
      minyan_id: minyanId,
      status: patch.status ?? existing?.status ?? 'yes',
      needs_ride: patch.needs_ride ?? existing?.needs_ride ?? false,
      responded_at: new Date().toISOString()
    }, { onConflict: 'member_id,minyan_id' });
    setBusy(null);
    router.refresh();
  }

  if (minyanim.length === 0) {
    return <p className="text-sm text-muted italic px-5 py-4">No upcoming services.</p>;
  }

  return (
    <div className="px-5 pt-4 space-y-2.5">
      {minyanim.map(m => {
        const c = commitMap.get(m.id);
        const status = c?.status;
        const needsRide = c?.needs_ride || false;
        const dim = busy === m.id;
        const day = formatServiceDate(m.service_date, { weekday: 'short', month: 'short', day: 'numeric' });
        const type = m.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv';
        return (
          <div key={m.id} className="bg-cream-warm border border-black/10 rounded-xl p-3">
            <div className="flex justify-between items-baseline mb-2">
              <div>
                <div className="font-serif text-[14px] font-semibold text-ink">{type}</div>
                <div className="text-[11px] text-muted">{day} · {m.display_time}</div>
              </div>
              <div className="text-[10px] font-mono text-muted">{m.yes_count}/{m.threshold}</div>
            </div>
            <div className="flex gap-1.5">
              <Choice on={status === 'yes'}    onClick={() => upsert(m.id, { status: 'yes' })}    disabled={dim} kind="yes">  I'm in</Choice>
              <Choice on={status === 'maybe'}  onClick={() => upsert(m.id, { status: 'maybe' })}  disabled={dim} kind="maybe">Maybe</Choice>
              <Choice on={status === 'no'}     onClick={() => upsert(m.id, { status: 'no' })}     disabled={dim} kind="no">   Out</Choice>
            </div>
            {(status === 'yes' || status === 'maybe' || needsRide) && (
              <button
                onClick={() => upsert(m.id, { needs_ride: !needsRide })}
                disabled={dim}
                className={`mt-2 text-[10px] ${needsRide ? 'text-amber font-semibold' : 'text-muted'}`}
              >
                🚗 {needsRide ? 'Need a ride ✓' : 'Need a ride?'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Choice({
  on, onClick, disabled, kind, children
}: {
  on: boolean;
  onClick: () => void;
  disabled: boolean;
  kind: 'yes' | 'maybe' | 'no';
  children: React.ReactNode;
}) {
  const onCls =
    kind === 'yes' ? 'bg-gold text-ink' :
    kind === 'maybe' ? 'bg-amber text-ink' :
    'bg-alert text-cream';
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex-1 py-2 rounded-lg text-[11px] font-bold ${
        on ? onCls : 'bg-parchment border border-black/10 text-ink'
      }`}>
      {children}
    </button>
  );
}
