import { redirect } from 'next/navigation';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { BottomTabBar } from '@/components/BottomTabBar';
import { AppHeader } from '@/components/AppHeader';
import { formatServiceDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');

  const sb = await supabaseServer();
  const nowIso = new Date().toISOString();

  const { data: teens } = await sb.from('v_teen_leaderboard_month').select('*')
    .order('points_this_month', { ascending: false, nullsFirst: false })
    .limit(20);
  const { data: recognition } = await sb.from('v_adult_recognition_month').select('*')
    .order('attendance_count', { ascending: false })
    .limit(20);

  const { data: openRaffle } = await sb.from('raffles').select('*')
    .lte('period_start', nowIso)
    .gte('period_end', nowIso)
    .is('drawn_at', null)
    .order('period_end', { ascending: true })
    .limit(1)
    .maybeSingle();

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'America/New_York' });

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <AppHeader member={member} subtitle={monthLabel} />

      <div className="px-5 pt-4">
        {openRaffle ? (
          <div
            className="rounded-lg p-3 mb-4 text-[11px] leading-snug text-ink"
            style={{ background: 'linear-gradient(135deg, #d9c194 0%, #b8935a 100%)' }}
          >
            <div className="font-serif text-sm font-bold mb-0.5">
              🎟 This quarter's raffle: {openRaffle.prize}
            </div>
            Every point you earn = one entry. Drawn after {formatServiceDate(
              (openRaffle.period_end as string).slice(0, 10),
              { month: 'short', day: 'numeric' }
            )}.
          </div>
        ) : (
          <div className="text-[11px] text-muted italic mb-4 px-1">
            Earn points to climb the board, redeem in the Store, or stack entries for the next raffle.
          </div>
        )}

        <div className="section-label">Teen Leaderboard</div>
        {(teens && teens.length > 0) ? (
          <div className="mb-6">
            {teens.map((r: any, i: number) => {
              const isYou = r.id === member.id;
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 py-2.5 border-b border-black/5 ${
                    isYou ? 'bg-cream-warm -mx-5 px-5' : ''
                  }`}
                >
                  <div className={`font-serif text-lg font-semibold w-6 ${
                    i < 3 ? 'text-gold-deep' : 'text-ink-light'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-cream-warm border border-black/10 flex items-center justify-center text-[11px] font-semibold">
                    {r.first_name[0]}{r.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-ink">
                      {isYou ? 'You' : `${r.first_name} ${r.last_name[0]}.`}
                    </div>
                    <div className="text-[10px] text-muted">
                      {r.minyanim_this_month} minyanim
                    </div>
                  </div>
                  <div className="font-mono text-[13px] font-semibold text-ink">
                    {r.points_this_month || 0}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted italic py-4">No teen activity yet this month.</div>
        )}

        <div className="section-label mt-4">Recognition · {monthLabel}</div>
        {(recognition && recognition.length > 0) ? (
          <div>
            {recognition.map((r: any) => (
              <div
                key={r.id}
                className="flex justify-between items-center py-2.5 border-b border-dashed border-black/5"
              >
                <div className="text-[13px] text-ink">
                  <span className="mr-1">⭐</span>
                  <strong>{r.first_name} {r.last_name[0]}.</strong>
                </div>
                <div className="text-[10px] text-gold-deep italic font-medium">
                  {r.attendance_count} minyanim
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted italic py-4">
            Adults appearing at 15+ minyanim will be honored here.
          </div>
        )}
      </div>

      <BottomTabBar active="leaderboard" role={member.role} />
    </div>
  );
}
