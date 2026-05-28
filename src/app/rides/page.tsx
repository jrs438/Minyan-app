import { redirect } from 'next/navigation';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { BottomTabBar } from '@/components/BottomTabBar';
import { AppHeader } from '@/components/AppHeader';
import { RideToggles } from '@/components/RideToggles';

export const dynamic = 'force-dynamic';

export default async function RidesPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');

  const sb = await supabaseServer();

  // Find next morning shacharit
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const { data: nextSh } = await sb.from('minyanim')
    .select('*').eq('minyan_type', 'shacharit')
    .gte('service_date', new Date().toISOString().slice(0, 10))
    .order('start_time').limit(1).maybeSingle();

  let needsRide: any[] = [];
  let offeringRide: any[] = [];

  if (nextSh) {
    const { data: nr } = await sb.from('commitments')
      .select('member_id, members!inner(id, first_name, last_name, neighborhood)')
      .eq('minyan_id', nextSh.id).eq('needs_ride', true);
    needsRide = nr || [];

    const { data: offers } = await sb.from('members')
      .select('id, first_name, last_name, neighborhood, ride_capacity')
      .eq('offers_ride_default', true).eq('active', true);
    offeringRide = offers || [];
  }

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <AppHeader
        member={member}
        subtitle={nextSh ? `Next · ${nextSh.display_time}` : 'Rides'}
      />

      <div className="px-5 pt-4">
        <RideToggles
          memberId={member.id}
          initialNeeds={member.needs_ride_default}
          initialOffers={member.offers_ride_default}
          neighborhood={member.neighborhood}
        />

        <div className="section-label mt-6">Need a Ride ({needsRide.length})</div>
        {needsRide.length === 0 && (
          <div className="text-sm text-muted italic py-3">No ride requests right now.</div>
        )}
        {needsRide.map((r: any) => (
          <div
            key={r.member_id}
            className="flex justify-between items-center py-3 border-b border-black/5"
          >
            <div>
              <div className="text-[13px] font-semibold text-ink">
                {r.members.first_name} {r.members.last_name}
              </div>
              <div className="text-[10px] text-muted italic">{r.members.neighborhood || '—'}</div>
            </div>
            <div className="bg-ink text-cream rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-wide">
              I'll pick up
            </div>
          </div>
        ))}

        <div className="section-label mt-5">Offering Rides ({offeringRide.length})</div>
        {offeringRide.map((r: any) => (
          <div key={r.id} className="flex justify-between items-center py-3 border-b border-black/5">
            <div>
              <div className="text-[13px] font-semibold text-ink">
                {r.first_name} {r.last_name[0]}.
              </div>
              <div className="text-[10px] text-muted italic">
                {r.neighborhood || '—'}
                {r.ride_capacity ? ` · can take ${r.ride_capacity}` : ''}
              </div>
            </div>
            <div className="border border-ink text-ink rounded-full px-3 py-1 text-[10px] font-semibold">
              {r.id === member.id ? 'You' : 'Contact'}
            </div>
          </div>
        ))}
      </div>

      <BottomTabBar active="rides" role={member.role} />
    </div>
  );
}
