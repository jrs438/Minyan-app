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
    .from('v_upcoming_minyanim').select('*').limit(5);
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
    const { data: lbRaw } = await sb.from('v_teen_leaderboard_month').select('*').limit(20);
    topTeens = (lbRaw || []) as LeaderboardRow[];
    const myIdx = topTeens.findIndex(t => t.id === member.id);
    const streak = await computeStreak(member.id);
    teenStats = {
      points: topTeens[myIdx]?.points_this_month || 0,
      minyanim: topTeens[myIdx]?.minyanim_this_month || 0,
      rank: myIdx >= 0 ? myIdx + 1 : topTeens.length + 1,
      totalTeens: topTeens.length,
      streak,
      climb: myIdx > 0 ? topTeens.slice(Math.max(0, myIdx - 2), myIdx + 1) : topTeens.slice(0, 3)
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
