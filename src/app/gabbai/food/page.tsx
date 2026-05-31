import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { FoodOrderManager } from '@/components/FoodOrderManager';

export const dynamic = 'force-dynamic';

export default async function GabbaiFoodPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  if (member.role !== 'gabbai' && member.role !== 'admin') redirect('/home');

  const sb = await supabaseServer();
  const { data: minyanim } = await sb.from('minyanim')
    .select('id, service_date, display_time, minyan_type')
    .gte('service_date', new Date().toISOString().slice(0, 10))
    .order('service_date')
    .order('start_time')
    .limit(14);

  const { data: orders } = await sb.from('food_orders').select('id, minyan_id, prompt, options');
  const orderMap = new Map((orders || []).map((o: any) => [o.minyan_id, o]));

  const { data: responses } = await sb.from('food_order_responses')
    .select('food_order_id, choice, member:member_id(first_name, last_name, role)');
  const respsByOrder: Record<string, any[]> = {};
  for (const r of responses || []) {
    const arr = respsByOrder[(r as any).food_order_id] || [];
    arr.push(r);
    respsByOrder[(r as any).food_order_id] = arr;
  }

  const rows = (minyanim || []).map((m: any) => {
    const order: any = orderMap.get(m.id);
    return {
      ...m,
      food_order: order
        ? { ...order, responses: respsByOrder[order.id] || [] }
        : null
    };
  });

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href="/gabbai" className="text-sm text-muted">‹ Gabbai</Link>
        <h1 className="font-serif text-2xl text-ink mt-2">Food Orders</h1>
        <p className="text-[12px] text-muted italic mt-1">
          Thursday-night slurpees, anything else you want to ask. Enable on any minyan, edit the prompt and options, and watch the tally fill in.
        </p>
      </div>
      <FoodOrderManager minyanim={rows} />
    </div>
  );
}
