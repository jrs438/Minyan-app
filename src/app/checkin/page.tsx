import { redirect } from 'next/navigation';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { CheckInButton } from '@/components/CheckInButton';
import { BottomTabBar } from '@/components/BottomTabBar';

export const dynamic = 'force-dynamic';

export default async function CheckInPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');

  const sb = await supabaseServer();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 15 * 60 * 1000); // -15 min past
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);   // +30 min future

  const { data: activeRaw } = await sb
    .from('v_upcoming_minyanim')
    .select('*')
    .gte('start_time', windowStart.toISOString())
    .lte('start_time', windowEnd.toISOString())
    .order('start_time', { ascending: true })
    .limit(1);

  const active = activeRaw?.[0];

  let alreadyChecked = false;
  if (active) {
    const { data } = await sb.from('attendance')
      .select('id').eq('member_id', member.id).eq('minyan_id', active.id).maybeSingle();
    alreadyChecked = !!data;
  }

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-6">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-gold-deep mb-2 text-center">
          Beth Tefillah
        </div>
        <h1 className="font-serif text-3xl text-ink text-center mb-1">Check In</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center font-serif text-4xl text-ink mb-6"
          style={{
            background: 'linear-gradient(135deg, #d9c194, #b8935a)',
            boxShadow: '0 12px 30px -8px rgba(184,147,90,0.4)'
          }}
        >
          ✡
        </div>

        {active ? (
          alreadyChecked ? (
            <>
              <h2 className="font-serif text-2xl text-ink mb-2">You're checked in.</h2>
              <p className="text-sm text-ink-light mb-8">
                {active.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv'} · {active.display_time}
              </p>
              <div className="font-mono text-[11px] text-gold-deep tracking-widest">
                ✓ POINTS AWARDED
              </div>
            </>
          ) : (
            <>
              <h2 className="font-serif text-2xl text-ink mb-2">You're here.</h2>
              <p className="text-sm text-ink-light mb-8">
                {active.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv'} · {active.display_time}
              </p>
              <CheckInButton minyanId={active.id} />
            </>
          )
        ) : (
          <>
            <h2 className="font-serif text-2xl text-ink mb-2">No minyan now.</h2>
            <p className="text-sm text-ink-light mb-8 max-w-xs">
              Check-in opens 15 min before and stays open for 30 min after the start time.
            </p>
          </>
        )}
      </div>

      <BottomTabBar active="checkin" role={member.role} />
    </div>
  );
}
