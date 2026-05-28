'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function EconomyForm({ config }: { config: any }) {
  const router = useRouter();
  const [form, setForm] = useState(config || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateField(field: string, value: number) {
    setForm({ ...form, [field]: value });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    const sb = supabaseBrowser();
    const { error } = await sb.from('rewards_config').update(form).eq('id', 1);
    setSaving(false);
    if (!error) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="px-5 pt-4">
      <Row label="Points per minyan (teen)" value={form.points_per_minyan || 8}
        onChange={v => updateField('points_per_minyan', v)} />
      <Row label="Bonus points (sponsored minyan)" value={form.points_per_sponsored_bonus || 4}
        onChange={v => updateField('points_per_sponsored_bonus', v)} />
      <Row label="Rescue response points (adult)" value={form.points_per_rescue || 40}
        onChange={v => updateField('points_per_rescue', v)} />
      <Row label="7-day streak bonus" value={form.points_per_streak_7 || 20}
        onChange={v => updateField('points_per_streak_7', v)} />
      <Row label="30-day streak bonus" value={form.points_per_streak_30 || 100}
        onChange={v => updateField('points_per_streak_30', v)} />
      <Row label="Point value (cents)" value={form.point_to_cents || 25}
        onChange={v => updateField('point_to_cents', v)}
        suffix={`$${((form.point_to_cents || 25) / 100).toFixed(2)} / pt`} />
      <Row label="Monthly #1 prize (cents)" value={form.monthly_prize_1_cents || 20000}
        onChange={v => updateField('monthly_prize_1_cents', v)}
        suffix={`$${((form.monthly_prize_1_cents || 20000) / 100).toFixed(0)}`} />
      <Row label="Monthly #2 prize (cents)" value={form.monthly_prize_2_cents || 7500}
        onChange={v => updateField('monthly_prize_2_cents', v)}
        suffix={`$${((form.monthly_prize_2_cents || 7500) / 100).toFixed(0)}`} />
      <Row label="Monthly #3 prize (cents)" value={form.monthly_prize_3_cents || 5000}
        onChange={v => updateField('monthly_prize_3_cents', v)}
        suffix={`$${((form.monthly_prize_3_cents || 5000) / 100).toFixed(0)}`} />
      <Row label="Quarterly champion prize (cents)" value={form.quarterly_prize_cents || 30000}
        onChange={v => updateField('quarterly_prize_cents', v)}
        suffix={`$${((form.quarterly_prize_cents || 30000) / 100).toFixed(0)}`} />
      <Row label="Redemption minimum (points)" value={form.min_redemption_points || 80}
        onChange={v => updateField('min_redemption_points', v)} />

      <button onClick={save} disabled={saving} className="btn-primary mt-6">
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
      </button>
    </div>
  );
}

function Row({ label, value, onChange, suffix }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="py-3 border-b border-black/5">
      <div className="flex justify-between items-center">
        <label className="text-[13px] text-ink flex-1 pr-3">{label}</label>
        <input type="number" value={value} onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="w-24 px-2 py-1.5 rounded bg-cream-warm border border-black/10 text-[13px] font-mono text-right" />
      </div>
      {suffix && <div className="text-[10px] text-muted text-right mt-1 italic">{suffix}</div>}
    </div>
  );
}
