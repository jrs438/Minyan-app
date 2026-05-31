'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export interface RosterRow {
  memberId: string;
  name: string;
  initials: string;
  role: string;
  status: 'yes' | 'maybe' | 'no' | null;
  needsRide: boolean;
  assignedDriverId: string | null;
  checkedIn: boolean;
}

export interface Driver {
  id: string;
  name: string;
}

export function GabbaiRoster({
  minyanId,
  roster,
  drivers
}: {
  minyanId: string;
  roster: RosterRow[];
  drivers: Driver[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function checkIn(r: RosterRow) {
    if (r.checkedIn) return;
    setBusy(r.memberId);
    await fetch('/api/gabbai/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minyan_id: minyanId, member_id: r.memberId })
    });
    setBusy(null);
    router.refresh();
  }

  async function upsertCommit(r: RosterRow, patch: Partial<RosterRow>) {
    setBusy(r.memberId);
    const sb = supabaseBrowser();
    await sb.from('commitments').upsert({
      member_id: r.memberId,
      minyan_id: minyanId,
      status: patch.status ?? r.status ?? 'yes',
      needs_ride: patch.needsRide ?? r.needsRide,
      assigned_driver_id:
        patch.assignedDriverId !== undefined
          ? patch.assignedDriverId
          : r.assignedDriverId,
      responded_at: new Date().toISOString()
    }, { onConflict: 'member_id,minyan_id' });
    setBusy(null);
    router.refresh();
  }

  if (roster.length === 0) {
    return <div className="text-sm text-muted italic py-3">No members yet.</div>;
  }

  return (
    <div>
      {roster.map(r => {
        const dim = busy === r.memberId;
        return (
          <div key={r.memberId} className="py-2.5 border-b border-black/5">
            <div className="flex items-center gap-2.5">
              <button onClick={() => checkIn(r)} disabled={r.checkedIn || dim}
                aria-label={r.checkedIn ? 'Checked in' : 'Check in'}
                className={`w-[20px] h-[20px] rounded flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${
                  r.checkedIn ? 'bg-ok text-white' : 'border-[1.5px] border-black/15'
                }`}>
                {r.checkedIn && '✓'}
              </button>
              <div className="w-8 h-8 rounded-full bg-cream-warm border border-black/10 flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                {r.initials}
              </div>
              <div className="flex-1 min-w-0 text-[12px] text-ink truncate">
                {r.name}
                {r.role !== 'member' && (
                  <em className="text-gold-deep text-[9px] ml-1">· {r.role}</em>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <PillButton on={r.status === 'yes'} onClick={() => upsertCommit(r, { status: 'yes' })}
                  disabled={dim} color="ok" label="Y" />
                <PillButton on={r.status === 'maybe'} onClick={() => upsertCommit(r, { status: 'maybe' })}
                  disabled={dim} color="amber" label="?" />
                <PillButton on={r.status === 'no'} onClick={() => upsertCommit(r, { status: 'no' })}
                  disabled={dim} color="alert" label="X" />
              </div>
            </div>
            {(r.needsRide || r.status === 'yes' || r.status === 'maybe') && (
              <div className="flex flex-wrap items-center gap-2 mt-1.5 pl-[58px]">
                <button
                  onClick={() => upsertCommit(r, { needsRide: !r.needsRide, assignedDriverId: r.needsRide ? null : r.assignedDriverId })}
                  disabled={dim}
                  className={`text-[10px] ${r.needsRide ? 'text-amber font-semibold' : 'text-muted'}`}
                >
                  🚗 {r.needsRide ? 'Needs ride' : 'Needs ride?'}
                </button>
                {r.needsRide && (
                  <select
                    value={r.assignedDriverId || ''}
                    onChange={e => upsertCommit(r, { assignedDriverId: e.target.value || null })}
                    disabled={dim}
                    className="text-[10px] rounded bg-cream-warm border border-black/10 px-1.5 py-0.5"
                  >
                    <option value="">— Assign driver —</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PillButton({
  on, onClick, disabled, color, label
}: {
  on: boolean;
  onClick: () => void;
  disabled: boolean;
  color: 'ok' | 'amber' | 'alert';
  label: string;
}) {
  const onClass =
    color === 'ok' ? 'bg-ok text-white' :
    color === 'amber' ? 'bg-amber text-ink' :
    'bg-alert text-cream';
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-7 h-6 rounded text-[10px] font-bold ${on ? onClass : 'bg-black/5 text-muted'}`}>
      {label}
    </button>
  );
}
