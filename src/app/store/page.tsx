import { redirect } from 'next/navigation';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { BottomTabBar } from '@/components/BottomTabBar';
import { StoreList } from '@/components/StoreList';

export const dynamic = 'force-dynamic';

export default async function StorePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');

  const sb = await supabaseServer();
  const { data: items } = await sb.from('store_items').select('*')
    .eq('active', true).order('sort_order').order('point_cost');
  const { data: ledger } = await sb.from('points_ledger').select('points').eq('member_id', member.id);
  const balance = (ledger || []).reduce((s, r) => s + Number(r.points), 0);
  const { data: redemptions } = await sb.from('store_redemptions').select('*')
    .eq('member_id', member.id).order('created_at', { ascending: false }).limit(10);

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-5">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-gold-deep mb-1">Rewards Store</div>
        <h1 className="font-serif text-3xl text-ink">Store</h1>
        <div className="mt-3 inline-flex items-baseline gap-1.5 bg-ink text-cream rounded-full px-4 py-1.5">
          <span className="font-serif text-xl font-semibold leading-none">{balance}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-80">points</span>
        </div>
      </div>

      <div className="px-5 pt-6">
        <StoreList items={items || []} balance={balance} />
      </div>

      {redemptions && redemptions.length > 0 && (
        <div className="px-5 pt-8">
          <div className="section-label">Your redemptions</div>
          {redemptions.map(r => (
            <div key={r.id} className="flex justify-between items-center py-2.5 border-b border-black/5">
              <div className="text-[13px] text-ink">{r.item_name}</div>
              <div className="text-[11px] text-muted">
                {Number(r.points_spent)} pts · {r.status === 'fulfilled' ? '✓ given' : r.status === 'cancelled' ? 'cancelled' : 'pending'}
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomTabBar active="store" role={member.role} />
    </div>
  );
}
