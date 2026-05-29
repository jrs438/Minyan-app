import { redirect } from 'next/navigation';
import { getCurrentMember, supabaseServer, supabaseAdmin } from '@/lib/supabase';
import { BottomTabBar } from '@/components/BottomTabBar';

export const dynamic = 'force-dynamic';

export default async function RafflePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');

  const sb = await supabaseServer();
  const now = new Date().toISOString();

  const { data: current } = await sb.from('raffles')
    .select('*')
    .lte('period_start', now)
    .gte('period_end', now)
    .is('drawn_at', null)
    .order('period_end', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: past } = await sb.from('raffles')
    .select('*, winner:winner_member_id(first_name, last_name)')
    .not('drawn_at', 'is', null)
    .order('drawn_at', { ascending: false })
    .limit(5);

  // Member's own entries in the current raffle = positive points earned in its window.
  let myEntries = 0;
  let totalEntries = 0;
  if (current) {
    const { data: my } = await sb.from('points_ledger').select('points')
      .eq('member_id', member.id)
      .gte('created_at', current.period_start)
      .lte('created_at', current.period_end)
      .gt('points', 0);
    myEntries = (my || []).reduce((s, r) => s + Number(r.points), 0);

    // Total uses the admin client so we can see the pool size even though RLS
    // only shows the caller their own ledger rows.
    const admin = supabaseAdmin();
    const { data: all } = await admin.from('points_ledger').select('points')
      .gte('created_at', current.period_start)
      .lte('created_at', current.period_end)
      .gt('points', 0);
    totalEntries = (all || []).reduce((s, r) => s + Number(r.points), 0);
  }

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-5">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-gold-deep mb-1">Quarterly Raffle</div>
        <h1 className="font-serif text-3xl text-ink">Raffle</h1>
      </div>

      <div className="px-5 pt-5">
        {current ? (
          <div
            className="rounded-xl p-5 text-cream mb-5"
            style={{ background: 'linear-gradient(135deg, #2a1f1a 0%, #0f1e2e 100%)' }}
          >
            <div className="font-mono text-[10px] tracking-[0.2em] text-gold-soft mb-1">CURRENT PRIZE</div>
            <div className="font-serif text-2xl font-semibold mb-1">{current.prize}</div>
            {current.prize_value_cents && (
              <div className="text-[11px] opacity-70 mb-3">~${(current.prize_value_cents / 100).toFixed(0)}</div>
            )}
            <div className="flex gap-5 mt-4">
              <div>
                <div className="font-serif text-3xl font-semibold text-gold-soft leading-none">{myEntries}</div>
                <div className="text-[9px] tracking-widest uppercase opacity-70 mt-1">Your entries</div>
              </div>
              <div>
                <div className="font-serif text-3xl font-semibold leading-none">{totalEntries}</div>
                <div className="text-[9px] tracking-widest uppercase opacity-70 mt-1">In the pool</div>
              </div>
            </div>
            <div className="text-[10px] opacity-70 mt-4">
              Draws after {new Date(current.period_end).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted italic">No raffle running right now.</p>
        )}

        {past && past.length > 0 && (
          <>
            <div className="section-label mt-6">Past winners</div>
            {past.map((r: any) => (
              <div key={r.id} className="flex justify-between items-center py-2.5 border-b border-black/5">
                <div>
                  <div className="text-[13px] font-semibold text-ink">{r.prize}</div>
                  <div className="text-[10px] text-muted">
                    {new Date(r.drawn_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}
                  </div>
                </div>
                <div className="text-[12px] text-gold-deep font-semibold">
                  {r.winner ? `${r.winner.first_name} ${r.winner.last_name}` : '—'}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <BottomTabBar active="raffle" role={member.role} />
    </div>
  );
}
