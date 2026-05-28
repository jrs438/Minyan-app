import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function WrapupPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  if (member.role !== 'gabbai' && member.role !== 'admin') redirect('/home');

  const sb = await supabaseServer();
  const { data: cfg } = await sb.from('rewards_config').select('*').eq('id', 1).single();
  const { data: teens } = await sb.from('v_teen_leaderboard_month').select('*').limit(10);
  const { data: recognition } = await sb.from('v_adult_recognition_month').select('*').limit(20);
  const { data: pool } = await sb.from('pool_state').select('*').eq('id', 1).single();

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const prizes = [
    cfg?.monthly_prize_1_cents || 20000,
    cfg?.monthly_prize_2_cents || 7500,
    cfg?.monthly_prize_3_cents || 5000
  ];

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href="/gabbai" className="text-sm text-muted">‹ Gabbai</Link>
        <h1 className="font-serif text-2xl text-ink mt-2">Monthly Wrap-Up</h1>
        <p className="text-[12px] text-muted italic">{monthLabel}</p>
      </div>

      <div className="px-5 pt-4">
        <div className="bg-cream-warm border border-black/10 rounded-xl p-4 mb-4">
          <div className="text-[11px] tracking-widest uppercase text-gold-deep font-mono font-semibold">
            Pool Balance
          </div>
          <div className="font-serif text-3xl font-semibold text-ink">
            ${pool ? (pool.balance_cents / 100).toLocaleString() : 0}
          </div>
        </div>

        <div className="section-label">Suggested Payouts</div>
        <div className="bg-cream-warm rounded-xl p-4 mb-5 border border-black/5">
          {teens && teens.length > 0 ? (
            teens.slice(0, 3).map((t: any, i: number) => (
              <div key={t.id} className="flex justify-between items-center py-2 border-b border-black/5 last:border-0">
                <div>
                  <div className="font-serif text-base text-ink">
                    #{i + 1}  {t.first_name} {t.last_name}
                  </div>
                  <div className="text-[11px] text-muted">
                    {t.points_this_month} pts · {t.minyanim_this_month} minyanim
                  </div>
                </div>
                <div className="font-serif text-lg text-gold-deep font-semibold">
                  ${(prizes[i] / 100).toFixed(0)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted italic">No teens on the board this month.</div>
          )}
          <div className="flex justify-between mt-3 pt-3 border-t border-black/10 font-semibold">
            <span>Total payout</span>
            <span className="text-ink">${((prizes[0] + prizes[1] + prizes[2]) / 100).toFixed(0)}</span>
          </div>
        </div>

        <div className="section-label">Recognition (15+ minyanim)</div>
        <div className="bg-cream-warm rounded-xl p-4 mb-5 border border-black/5">
          {recognition && recognition.length > 0 ? (
            recognition.map((r: any) => (
              <div key={r.id} className="flex justify-between items-center py-1.5">
                <span className="text-[13px] text-ink">⭐ {r.first_name} {r.last_name}</span>
                <span className="text-[11px] text-muted">{r.attendance_count}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted italic">No 15+ attenders yet.</div>
          )}
        </div>

        <div className="text-[11px] text-muted italic px-2">
          Take this list to your treasurer. Send gift cards manually, then record them in the Rewards table. v2 will automate this.
        </div>
      </div>
    </div>
  );
}
