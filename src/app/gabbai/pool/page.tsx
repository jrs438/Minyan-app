import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { PoolManager } from '@/components/PoolManager';

export const dynamic = 'force-dynamic';

export default async function GabbaiPoolPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  if (member.role !== 'gabbai' && member.role !== 'admin') redirect('/home');

  const sb = await supabaseServer();
  const { data: pool } = await sb.from('pool_state').select('*').eq('id', 1).single();
  const { data: recent } = await sb.from('sponsorships').select('*')
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href="/gabbai" className="text-sm text-muted">‹ Gabbai</Link>
        <h1 className="font-serif text-2xl text-ink mt-2">Sponsorship Pool</h1>
        <p className="text-[12px] text-muted italic mt-1">
          The shul's incentive fund. Record donations made directly to the synagogue (check, cash) here so they roll into the running balance alongside Stripe payments.
        </p>
      </div>
      <PoolManager pool={pool} recent={recent || []} />
    </div>
  );
}
