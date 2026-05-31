import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase';

// Records a manual donation to the sponsorship pool (e.g. a check or cash gift
// given directly to the synagogue). Inserts a "paid" sponsorship row for the
// audit trail and bumps the running pool_state balance.
export async function POST(req: NextRequest) {
  const { amount_cents, note } = await req.json();
  const amt = Math.round(Number(amount_cents));
  if (!Number.isFinite(amt) || amt <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive number.' }, { status: 400 });
  }

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { data: me } = await sb.from('members').select('role').eq('auth_user_id', user.id).maybeSingle();
  if (!me || (me.role !== 'gabbai' && me.role !== 'admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = supabaseAdmin();

  await admin.from('sponsorships').insert({
    sponsor_member_id: null,
    amount_cents: amt,
    status: 'paid',
    contribution_type: 'pool',
    paid_at: new Date().toISOString(),
    notes: note || null
  });

  const { data: pool } = await admin.from('pool_state').select('*').eq('id', 1).single();
  const newBalance = (pool?.balance_cents || 0) + amt;
  await admin.from('pool_state').update({
    balance_cents: newBalance,
    total_contributed_cents: (pool?.total_contributed_cents || 0) + amt,
    total_sponsors: (pool?.total_sponsors || 0) + 1,
    updated_at: new Date().toISOString()
  }).eq('id', 1);

  return NextResponse.json({ ok: true, balance: newBalance });
}
