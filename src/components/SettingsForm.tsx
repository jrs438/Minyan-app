'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function SettingsForm({ settings }: { settings: any }) {
  const router = useRouter();
  const [cbt, setCbt] = useState(settings?.whatsapp_cbt_url || '');
  const [teen, setTeen] = useState(settings?.whatsapp_teen_url || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const sb = supabaseBrowser();
    const { error } = await sb.from('app_settings').update({
      whatsapp_cbt_url: cbt || null,
      whatsapp_teen_url: teen || null,
      updated_at: new Date().toISOString()
    }).eq('id', 1);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="px-5 pt-4 space-y-5">
      <div className="bg-cream-warm border border-black/10 rounded-xl p-4 space-y-3">
        <div className="font-serif text-[15px] font-semibold text-ink">WhatsApp group links</div>
        <p className="text-[11px] text-muted italic">
          Paste the WhatsApp group invite links. When set, they appear as quick-open buttons on the gabbai console.
        </p>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted">CBT Minyan WhatsApp</label>
          <input
            placeholder="https://chat.whatsapp.com/…"
            value={cbt}
            onChange={e => setCbt(e.target.value)}
            inputMode="url"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted">Teen Minyan WhatsApp</label>
          <input
            placeholder="https://chat.whatsapp.com/…"
            value={teen}
            onChange={e => setTeen(e.target.value)}
            inputMode="url"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm font-mono"
          />
        </div>
        {error && <div className="text-sm text-alert">{error}</div>}
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}
