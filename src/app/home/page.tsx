import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { isCurrentlyShabbatOrYomTov } from '@/lib/shabbat';
import { computeStreak } from '@/lib/streaks';
import { ShabbatScreen } from '@/components/ShabbatScreen';
import { MemberHome } from '@/components/MemberHome';
import { TeenHome } from '@/components/TeenHome';
import { BottomTabBar } from '@/components/BottomTabBar';
import type { UpcomingMinyan, PoolState, LeaderboardRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');

  const shabbat = await isCurrentlyShabbatOrYomTov();
  if (shabbat.isRestricted) return <ShabbatScreen reason={shabbat.reason} endsAt={shabbat.endsAt} />;

  const sb = await supabaseServer();

  const { data: upcomingRaw } = await sb
    .from('v_upcoming_minyanim').select('*')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(10);
  const upcoming = (upcomingRaw || []) as UpcomingMinyan[];

  const { data: myCommits } = await sb
    .from('commitments').select('minyan_id, status, needs_ride')
    .eq('member_id', member.id)
    .in('minyan_id', upcoming.map(m => m.id));

  const commitMap: Record<string, { status: string; needs_ride: boolean }> = {};
  (myCommits || []).forEach(c => { commitMap[c.minyan_id] = c; });

  const { data: pool } = await sb
    .from('pool_state').select('*').eq('id', 1).single();

  let teenStats = null;
  let topTeens: LeaderboardRow[] = [];
  if (member.role === 'teen') {
    const { data: lbRaw } = await sb.from('v_teen_leaderboard_month').select('*')
      .order('points_this_month', { ascending: false, nullsFirst: false })
      .limit(20);
    topTeens = (lbRaw || []) as LeaderboardRow[];
    const myIdx = topTeens.findIndex(t => t.id === member.id);
    const streak = await computeStreak(member.id);

    // Climb-card slice: two above + you when you have peers above; top 3 when
    // you're #1 or unranked. Attach each row's absolute rank so the renderer
    // doesn't have to derive it (which had a bug for #1-ranked teens).
    const sliceStart = myIdx > 0 ? Math.max(0, myIdx - 2) : 0;
    const sliceEnd = myIdx > 0 ? myIdx + 1 : Math.min(topTeens.length, 3);
    const climb: Array<LeaderboardRow & { rank: number }> = [];
    for (let j = sliceStart; j < sliceEnd; j++) {
      climb.push({ ...topTeens[j], rank: j + 1 });
    }

    teenStats = {
      points: topTeens[myIdx]?.points_this_month || 0,
      minyanim: topTeens[myIdx]?.minyanim_this_month || 0,
      rank: myIdx >= 0 ? myIdx + 1 : topTeens.length + 1,
      totalTeens: topTeens.length,
      streak,
      climb
    };
  }

  return (
    <div className="min-h-screen bg-parchment pb-20">
      {member.role === 'teen' ? (
        <TeenHome
          member={member}
          upcoming={upcoming}
          commitMap={commitMap}
          pool={pool as PoolState}
          stats={teenStats!}
        />
      ) : (
        <MemberHome
          member={member}
          upcoming={upcoming}
          commitMap={commitMap}
          pool={pool as PoolState}
        />
      )}
      <BottomTabBar active="home" role={member.role} />
    </div>
  );
}
