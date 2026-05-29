import { redirect } from 'next/navigation';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { BottomTabBar } from '@/components/BottomTabBar';
import { AppHeader } from '@/components/AppHeader';
import { GabbaiAlertCard } from '@/components/GabbaiAlertCard';
import { GabbaiRoster } from '@/components/GabbaiRoster';
import Link from 'next/link';
import type { UpcomingMinyan } from '@/lib/types';
import { formatServiceDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function GabbaiPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  if (member.role !== 'gabbai' && member.role !== 'admin') redirect('/home');

  const sb = await supabaseServer();

  // Next 3 minyanim
  const { data: upcomingRaw } = await sb
    .from('v_upcoming_minyanim').select('*')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(3);
  const upcoming = (upcomingRaw || []) as UpcomingMinyan[];

  // Next minyan for roster
  const next = upcoming[0];
  let roster: any[] = [];
  if (next) {
    const { data: commits } = await sb
      .from('commitments')
      .select('status, needs_ride, members!inner(id, first_name, last_name, role, is_teen, neighborhood)')
      .eq('minyan_id', next.id);
    const { data: attendance } = await sb
      .from('attendance')
      .select('member_id')
      .eq('minyan_id', next.id);
    const attSet = new Set((attendance || []).map(a => a.member_id));

    roster = (commits || []).map((c: any) => ({
      memberId: c.members.id,
      name: `${c.members.first_name} ${c.members.last_name}`,
      initials: `${c.members.first_name[0]}${c.members.last_name[0]}`,
      role: c.members.role,
      isTeen: c.members.is_teen,
      status: c.status,
      needsRide: c.needs_ride,
      checkedIn: attSet.has(c.members.id)
    })).sort((a, b) => {
      // yes first, then maybe, then no; checked-in at top of each
      const order = { yes: 0, maybe: 1, no: 2 } as any;
      return (order[a.status] - order[b.status]) || (a.checkedIn ? -1 : 1);
    });
  }

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <AppHeader member={member} subtitle={`${member.role.toUpperCase()} · CONSOLE`} />

      <div className="px-5 pt-4">
        {upcoming.map(m => (
          <GabbaiAlertCard key={m.id} minyan={m} />
        ))}

        {next && (
          <>
            <div className="section-label mt-5">
              {formatServiceDate(next.service_date, { weekday: 'long' })} Roster · {next.display_time}
            </div>
            <GabbaiRoster minyanId={next.id} roster={roster} />
          </>
        )}

        <div className="section-label mt-5">Admin Actions</div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/gabbai/members" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            + Add Member
          </Link>
          <Link href="/gabbai/times" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            Edit Times
          </Link>
          <Link href="/gabbai/wrapup" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            Month Wrap-Up
          </Link>
          <Link href="/gabbai/economy" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            Economy
          </Link>
          <Link href="/gabbai/store" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            Store
          </Link>
          <Link href="/gabbai/raffle" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            Raffle
          </Link>
        </div>
      </div>

      <BottomTabBar active="gabbai" role={member.role} />
    </div>
  );
}
