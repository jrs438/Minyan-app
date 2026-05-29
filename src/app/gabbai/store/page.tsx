import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { StoreManager } from '@/components/StoreManager';

export const dynamic = 'force-dynamic';

export default async function GabbaiStorePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  if (member.role !== 'gabbai' && member.role !== 'admin') redirect('/home');

  const sb = await supabaseServer();
  const { data: items } = await sb.from('store_items').select('*')
    .order('active', { ascending: false }).order('sort_order').order('point_cost');
  const { data: pending } = await sb.from('store_redemptions')
    .select('*, members(first_name, last_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href="/gabbai" className="text-sm text-muted">‹ Gabbai</Link>
        <h1 className="font-serif text-2xl text-ink mt-2">Store</h1>
        <p className="text-[12px] text-muted italic mt-1">
          Stock gift cards and swag with point prices. Redemptions appear here to hand over.
        </p>
      </div>
      <StoreManager items={items || []} pending={pending || []} />
    </div>
  );
}
