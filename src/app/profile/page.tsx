import { redirect } from 'next/navigation';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { BottomTabBar } from '@/components/BottomTabBar';
import { ProfileContent } from '@/components/ProfileContent';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');

  const sb = await supabaseServer();

  // Points this month
  const { data: ledgerMonth } = await sb.from('points_ledger')
    .select('points').eq('member_id', member.id)
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
  const pointsMonth = (ledgerMonth || []).reduce((sum, r) => sum + (r.points || 0), 0);

  // All-time attendance
  const { count: attendanceAllTime } = await sb.from('attendance')
    .select('*', { count: 'exact', head: true }).eq('member_id', member.id);

  // Rewards claimed
  const { data: rewards } = await sb.from('rewards_claimed')
    .select('*').eq('member_id', member.id).order('created_at', { ascending: false }).limit(5);

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <ProfileContent
        member={member}
        pointsMonth={pointsMonth}
        attendanceAllTime={attendanceAllTime || 0}
        rewards={rewards || []}
      />
      <BottomTabBar active="profile" role={member.role} />
    </div>
  );
}
