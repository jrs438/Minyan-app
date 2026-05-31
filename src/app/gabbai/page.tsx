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

  const { data: settings } = await sb.from('app_settings').select('*').eq('id', 1).maybeSingle();

  // Next 3 minyanim
  const { data: upcomingRaw } = await sb
    .from('v_upcoming_minyanim').select('*')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(3);
  const upcoming = (upcomingRaw || []) as UpcomingMinyan[];

  // Next minyan for roster — show ALL active members so the gabbai can RSVP /
  // assign rides on behalf of anyone who hasn't responded yet.
  const next = upcoming[0];
  let roster: any[] = [];
  let drivers: { id: string; name: string }[] = [];
  if (next) {
    const { data: members } = await sb.from('members')
      .select('id, first_name, last_name, role, is_teen, offers_ride_default, ride_capacity')
      .eq('active', true);
    const { data: commits } = await sb.from('commitments')
      .select('member_id, status, needs_ride, assigned_driver_id')
      .eq('minyan_id', next.id);
    const { data: attendance } = await sb.from('attendance')
      .select('member_id')
      .eq('minyan_id', next.id);

    const commitMap = new Map((commits || []).map((c: any) => [c.member_id, c]));
    const attSet = new Set((attendance || []).map(a => a.member_id));

    roster = (members || []).map((m: any) => {
      const c: any = commitMap.get(m.id);
      return {
        memberId: m.id,
        name: `${m.first_name} ${m.last_name}`,
        initials: `${m.first_name[0]}${m.last_name[0]}`,
        role: m.role,
        status: c?.status || null,
        needsRide: c?.needs_ride || false,
        assignedDriverId: c?.assigned_driver_id || null,
        checkedIn: attSet.has(m.id)
      };
    }).sort((a: any, b: any) => {
      const score = (r: any) => {
        if (r.checkedIn) return 0;
        if (r.status === 'yes') return 1;
        if (r.status === 'maybe') return 2;
        if (!r.status) return 3;
        return 4;
      };
      const diff = score(a) - score(b);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });

    drivers = (members || [])
      .filter((m: any) => m.offers_ride_default || (m.ride_capacity && m.ride_capacity > 0))
      .map((m: any) => ({ id: m.id, name: `${m.first_name} ${m.last_name}` }));
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
            <GabbaiRoster minyanId={next.id} roster={roster} drivers={drivers} />
          </>
        )}

        {(settings?.whatsapp_cbt_url || settings?.whatsapp_teen_url) && (
          <>
            <div className="section-label mt-5">Quick Links</div>
            <div className="grid grid-cols-2 gap-2">
              {settings?.whatsapp_cbt_url && (
                <a href={settings.whatsapp_cbt_url} target="_blank" rel="noopener noreferrer"
                  className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
                  💬 CBT WhatsApp
                </a>
              )}
              {settings?.whatsapp_teen_url && (
                <a href={settings.whatsapp_teen_url} target="_blank" rel="noopener noreferrer"
                  className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
                  💬 Teen WhatsApp
                </a>
              )}
            </div>
          </>
        )}

        <div className="section-label mt-5">Admin Actions</div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/gabbai/members" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            + Add Member
          </Link>
          <Link href="/gabbai/award" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            🏅 Award Points
          </Link>
          <Link href="/gabbai/times" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            Edit Times
          </Link>
          <Link href="/gabbai/wrapup" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            Month Wrap-Up
          </Link>
          <Link href="/gabbai/store" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            Store
          </Link>
          <Link href="/gabbai/raffle" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            Raffle
          </Link>
          <Link href="/gabbai/pool" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            Pool
          </Link>
          <Link href="/gabbai/food" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            🍧 Food Orders
          </Link>
          <Link href="/gabbai/economy" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            Incentives
          </Link>
          <Link href="/gabbai/settings" className="bg-cream-warm border border-black/5 rounded-lg p-3 text-center text-[11px] font-semibold text-ink">
            ⚙ Settings
          </Link>
        </div>
      </div>

      <BottomTabBar active="gabbai" role={member.role} />
    </div>
  );
}
