import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { raffle_id } = await req.json();
  if (!raffle_id) return NextResponse.json({ error: 'raffle_id required' }, { status: 400 });

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { data: me } = await sb.from('members').select('role').eq('auth_user_id', user.id).maybeSingle();
  if (!me || (me.role !== 'gabbai' && me.role !== 'admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = supabaseAdmin();
  const { data: raffle } = await admin.from('raffles').select('*').eq('id', raffle_id).single();
  if (!raffle) return NextResponse.json({ error: 'raffle not found' }, { status: 404 });
  if (raffle.drawn_at) return NextResponse.json({ error: 'Already drawn' }, { status: 400 });

  // Each positive ledger entry (earned points, not redemptions) within the
  // raffle's window counts toward that member's entry weight.
  const { data: rows } = await admin.from('points_ledger')
    .select('member_id, points')
    .gte('created_at', raffle.period_start)
    .lte('created_at', raffle.period_end)
    .gt('points', 0);

  const tally = new Map<string, number>();
  for (const r of rows || []) {
    tally.set(r.member_id, (tally.get(r.member_id) || 0) + Number(r.points));
  }
  if (tally.size === 0) return NextResponse.json({ error: 'No entries to draw from' }, { status: 400 });

  const total = Array.from(tally.values()).reduce((a, b) => a + b, 0);
  let pick = Math.random() * total;
  let winner: string | null = null;
  for (const [memberId, weight] of tally) {
    pick -= weight;
    if (pick <= 0) { winner = memberId; break; }
  }
  if (!winner) winner = Array.from(tally.keys())[tally.size - 1];

  await admin.from('raffles').update({
    winner_member_id: winner,
    drawn_at: new Date().toISOString()
  }).eq('id', raffle_id);

  return NextResponse.json({ ok: true, winner_member_id: winner });
}
