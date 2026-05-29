'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

// Convert a wall-clock time (hh:mm on serviceDate) interpreted in
// America/New_York into the correct UTC instant, accounting for EST vs EDT.
function nyWallClockToUTC(serviceDate: string, hh: number, mm: number): Date {
  const [y, mo, d] = serviceDate.split('-').map(Number);
  const asUTC = Date.UTC(y, mo - 1, d, hh, mm, 0);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(new Date(asUTC));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const nyAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return new Date(asUTC - (nyAsUTC - asUTC));
}

export function TimesEditor({ minyanim }: { minyanim: any[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  async function updateTime(id: string, newTime: string, serviceDate: string) {
    setSaving(id);
    const sb = supabaseBrowser();
    const [h, mPart] = newTime.split(':');
    const start = nyWallClockToUTC(serviceDate, Number(h), Number(mPart));
    const startIso = start.toISOString();
    const displayTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York'
    });

    await sb.from('minyanim').update({ start_time: startIso, display_time: displayTime }).eq('id', id);
    setSaving(null);
    router.refresh();
  }

  return (
    <div className="px-5">
      {minyanim.map(m => {
        const d = new Date(m.start_time);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const timeValue = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });
        const typeLabel = m.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv';
        return (
          <div key={m.id} className="flex justify-between items-center py-2.5 border-b border-black/5">
            <div>
              <div className="text-[13px] font-semibold text-ink">{dayStr}</div>
              <div className="text-[11px] text-muted">{typeLabel}</div>
            </div>
            <input
              type="time"
              defaultValue={timeValue}
              onBlur={(e) => updateTime(m.id, e.target.value, m.service_date)}
              className="px-3 py-2 rounded bg-cream-warm border border-black/10 text-sm font-mono"
              disabled={saving === m.id}
            />
          </div>
        );
      })}
    </div>
  );
}
