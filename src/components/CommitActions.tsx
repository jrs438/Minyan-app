'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function CommitActions({
  minyanId,
  currentStatus,
  currentNeedsRide,
  isBelow,
  hasDedication,
  sponsorUrl
}: {
  minyanId: string;
  currentStatus?: 'yes' | 'no' | 'maybe';
  currentNeedsRide: boolean;
  isBelow: boolean;
  hasDedication: boolean;
  sponsorUrl: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [needsRide, setNeedsRide] = useState(currentNeedsRide);

  async function submit(status: 'yes' | 'no' | 'maybe', ride = needsRide) {
    setSaving(true);
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const { data: me } = await sb.from('members').select('id').eq('auth_user_id', user.id).single();
    if (!me) { setSaving(false); return; }

    await sb.from('commitments').upsert(
      { member_id: me.id, minyan_id: minyanId, status, needs_ride: ride, responded_at: new Date().toISOString() },
      { onConflict: 'member_id,minyan_id' }
    );
    setSaving(false);
    router.push('/home');
    router.refresh();
  }

  function handleNoClick() {
    // Soft nudge if below threshold
    if (isBelow && currentStatus !== 'no') {
      setNudgeOpen(true);
    } else {
      submit('no');
    }
  }

  if (nudgeOpen) {
    return (
      <div className="mt-8">
        <div className="font-serif text-xl text-ink mb-2 leading-tight">
          Can't make it?
        </div>
        <div className="text-sm text-ink-light mb-4 leading-relaxed">
          Letting us know helps the gabbai plan.
          {hasDedication && ' This is a dedicated minyan — extra care is being taken to fill it.'}
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => submit('no')}
            disabled={saving}
            className="btn-primary"
          >
            Yes, I'm out — continue
          </button>
          <Link href={sponsorUrl} className="btn-secondary block text-center">
            Support the pool instead →
          </Link>
          <button
            onClick={() => submit('yes')}
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-transparent border border-ink text-ink font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Actually, I'll come
          </button>
          <button
            onClick={() => setNudgeOpen(false)}
            className="w-full text-xs text-muted underline py-2"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-2.5">
      <button
        onClick={() => submit('yes')}
        disabled={saving}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide active:scale-[0.98] transition-transform ${
          currentStatus === 'yes' ? 'bg-gold text-ink' : 'bg-ink text-cream'
        }`}
      >
        {currentStatus === 'yes' ? '✓ You\'re in' : 'I\'m coming'}
      </button>

      <button
        onClick={() => submit('maybe')}
        disabled={saving}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide active:scale-[0.98] transition-transform border ${
          currentStatus === 'maybe' ? 'bg-amber text-ink border-amber' : 'bg-parchment text-ink border-black/10'
        }`}
      >
        Maybe — call me if needed
      </button>

      <button
        onClick={handleNoClick}
        disabled={saving}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide active:scale-[0.98] transition-transform border ${
          currentStatus === 'no' ? 'bg-alert text-cream border-alert' : 'bg-parchment text-ink border-black/10'
        }`}
      >
        Can't make it
      </button>

      <label className="flex items-center gap-3 mt-4 text-sm text-ink cursor-pointer px-2">
        <input
          type="checkbox"
          checked={needsRide}
          onChange={e => setNeedsRide(e.target.checked)}
          className="w-5 h-5 accent-gold"
        />
        <span>I'd need a ride</span>
      </label>
    </div>
  );
}
