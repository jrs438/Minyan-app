'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Member } from '@/lib/types';

export function AwardForm({ members }: { members: Member[] }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!memberId || !amount || !reason) return;
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt === 0) {
      setError('Enter a non-zero number.');
      return;
    }
    setSaving(true);
    setError(null);
    setResult(null);
    const sb = supabaseBrowser();
    const { error } = await sb.from('points_ledger').insert({
      member_id: memberId,
      points: amt,
      reason: 'gabbai_award',
      description: reason
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    const who = members.find(m => m.id === memberId);
    setResult(`Awarded ${amt} pt${Math.abs(amt) === 1 ? '' : 's'} to ${who?.first_name} ${who?.last_name}.`);
    setAmount('');
    setReason('');
    router.refresh();
  }

  // Show teens & preteens first since they're the most common recipients.
  const sorted = [...members].sort((a, b) => {
    const earnsA = a.role === 'teen' || a.role === 'preteen' ? 0 : 1;
    const earnsB = b.role === 'teen' || b.role === 'preteen' ? 0 : 1;
    if (earnsA !== earnsB) return earnsA - earnsB;
    return a.first_name.localeCompare(b.first_name);
  });

  return (
    <div className="px-5 pt-4">
      <div className="bg-cream-warm border border-black/10 rounded-xl p-4 space-y-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted">Member</label>
          <select value={memberId} onChange={e => setMemberId(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm">
            <option value="">Choose…</option>
            {sorted.map(m => (
              <option key={m.id} value={m.id}>
                {m.first_name} {m.last_name} · {m.role}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wider text-muted">Points</label>
            <input
              inputMode="decimal"
              placeholder="e.g. 2"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^\d.\-]/g, ''))}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted">Reason</label>
          <input
            placeholder="e.g. Led davening, D'var Torah"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm"
          />
        </div>

        {error && <div className="text-sm text-alert">{error}</div>}
        {result && <div className="text-sm text-ok">{result}</div>}

        <button onClick={save} disabled={saving || !memberId || !amount || !reason}
          className="btn-primary">
          {saving ? 'Saving…' : 'Award points'}
        </button>
      </div>

      <p className="text-[11px] text-muted italic mt-4">
        Use a negative number to remove points (e.g. correcting a mistake). Award is recorded in the points ledger.
      </p>
    </div>
  );
}
