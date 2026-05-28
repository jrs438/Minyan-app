'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Member } from '@/lib/types';

export function ProfileContent({
  member,
  pointsMonth,
  attendanceAllTime,
  rewards
}: {
  member: Member;
  pointsMonth: number;
  attendanceAllTime: number;
  rewards: any[];
}) {
  const router = useRouter();
  const [prefs, setPrefs] = useState({
    commit: member.notif_commit_reminder,
    alert: member.notif_red_alert,
    ride: member.notif_ride_request,
    rewards: member.notif_rewards
  });
  const [neighborhood, setNeighborhood] = useState(member.neighborhood || '');

  async function savePref(field: string, value: boolean) {
    const sb = supabaseBrowser();
    await sb.from('members').update({ [field]: value }).eq('id', member.id);
    router.refresh();
  }

  async function saveNeighborhood() {
    const sb = supabaseBrowser();
    await sb.from('members').update({ neighborhood }).eq('id', member.id);
    router.refresh();
  }

  async function signOut() {
    const sb = supabaseBrowser();
    await sb.auth.signOut();
    router.push('/auth/login');
  }

  const initials = `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();

  return (
    <div>
      <div className="px-5 pt-4 pb-2">
        <Link href="/home" className="text-sm text-muted">‹ Home</Link>
      </div>

      <div className="text-center py-4 border-b border-black/5 mx-5">
        <div
          className="w-[70px] h-[70px] rounded-full mx-auto mb-2.5 flex items-center justify-center font-serif text-[26px] font-semibold text-ink"
          style={{
            background: 'linear-gradient(135deg, #efe6cf, #d9c194)',
            border: '2px solid #faf6ec',
            boxShadow: '0 0 0 1px rgba(15,30,46,0.14)'
          }}
        >
          {initials}
        </div>
        <div className="font-serif text-[22px] font-medium text-ink">
          {member.first_name} {member.last_name}
        </div>
        <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-gold-deep mt-1">
          {member.role.toUpperCase()}
          {member.member_since_hebrew_year && ` · SINCE ${member.member_since_hebrew_year}`}
        </div>
      </div>

      <div className="px-5 pt-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatBox n={pointsMonth.toString()} l="Pts · Month" />
          <StatBox n={attendanceAllTime.toString()} l="All-Time" />
          <StatBox n="—" l="Streak" />
        </div>

        {rewards.length > 0 && (
          <>
            <div className="section-label">Rewards Claimed</div>
            <div className="space-y-1.5 mb-5">
              {rewards.map(r => (
                <div key={r.id} className="text-[12px] text-ink-light italic py-1">
                  {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} — ${(r.amount_cents / 100).toFixed(0)} · {r.reason.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="section-label">Neighborhood</div>
        <div className="flex gap-2 mb-5">
          <input
            value={neighborhood}
            onChange={e => setNeighborhood(e.target.value)}
            placeholder="e.g. East Paramus"
            className="flex-1 px-3 py-2 rounded-lg bg-cream-warm border border-black/10 text-[13px]"
          />
          <button onClick={saveNeighborhood} className="px-4 py-2 rounded-lg bg-ink text-cream text-[12px] font-semibold">
            Save
          </button>
        </div>

        <div className="section-label">Notifications</div>
        <PrefRow label="Commitment reminders" on={prefs.commit}
          onChange={v => { setPrefs({ ...prefs, commit: v }); savePref('notif_commit_reminder', v); }} />
        <PrefRow label="Red alerts (minyan needs you)" on={prefs.alert}
          onChange={v => { setPrefs({ ...prefs, alert: v }); savePref('notif_red_alert', v); }} />
        <PrefRow label="Ride requests" on={prefs.ride}
          onChange={v => { setPrefs({ ...prefs, ride: v }); savePref('notif_ride_request', v); }} />
        <PrefRow label="Rewards updates" on={prefs.rewards}
          onChange={v => { setPrefs({ ...prefs, rewards: v }); savePref('notif_rewards', v); }} />

        <button
          onClick={signOut}
          className="w-full mt-8 text-sm text-muted underline py-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function StatBox({ n, l }: { n: string; l: string }) {
  return (
    <div className="bg-cream-warm rounded-lg py-2.5 px-1 text-center">
      <div className="font-serif text-xl font-semibold text-ink leading-none">{n}</div>
      <div className="text-[9px] text-muted mt-1 tracking-wider uppercase">{l}</div>
    </div>
  );
}

function PrefRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex justify-between items-center w-full py-3 border-b border-black/5 text-[12px] text-ink"
    >
      <span>{label}</span>
      <div className={`w-9 h-5 rounded-full relative transition-colors ${on ? 'bg-ok' : 'bg-black/15'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </div>
    </button>
  );
}
