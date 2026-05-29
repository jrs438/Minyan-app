import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { item_id } = await req.json();
  if (!item_id) return NextResponse.json({ error: 'item_id required' }, { status: 400 });

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { data: member } = await sb.from('members').select('id').eq('auth_user_id', user.id).single();
  if (!member) return NextResponse.json({ error: 'no member record' }, { status: 403 });

  const admin = supabaseAdmin();
  const { data: item } = await admin.from('store_items').select('*').eq('id', item_id).single();
  if (!item || !item.active) return NextResponse.json({ error: 'Item unavailable' }, { status: 404 });
  if (item.stock !== null && item.stock <= 0) return NextResponse.json({ error: 'Out of stock' }, { status: 400 });

  const { data: ledger } = await admin.from('points_ledger').select('points').eq('member_id', member.id);
  const balance = (ledger || []).reduce((s, r) => s + Number(r.points), 0);
  const cost = Number(item.point_cost);
  if (balance < cost) return NextResponse.json({ error: 'Not enough points', balance }, { status: 400 });

  // Deduct points, log the redemption, decrement stock.
  await admin.from('points_ledger').insert({
    member_id: member.id, points: -cost, reason: 'redemption', description: `Redeemed: ${item.name}`
  });
  await admin.from('store_redemptions').insert({
    member_id: member.id, item_id: item.id, item_name: item.name, points_spent: cost, status: 'pending'
  });
  if (item.stock !== null) {
    await admin.from('store_items').update({ stock: item.stock - 1 }).eq('id', item.id);
  }

  return NextResponse.json({ ok: true, balance: balance - cost });
}
