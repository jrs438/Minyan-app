import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase';
import { awardStreakBonuses } from '@/lib/streaks';

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: gabbai } = await sb.from('members').select('*').eq('auth_user_id', user.id).single();
  if (!gabbai || (gabbai.role !== 'gabbai' && gabbai.role !== 'admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { minyan_id, member_id } = await req.json();
  const admin = supabaseAdmin();

  const { data: minyan } = await admin.from('minyanim').select('*').eq('id', minyan_id).single();
  if (!minyan) return NextResponse.json({ error: 'minyan not found' }, { status: 404 });

  const { data: member } = await admin.from('members').select('*').eq('id', member_id).single();
  if (!member) return NextResponse.json({ error: 'member not found' }, { status: 404 });

  const { data: existing } = await admin.from('attendance')
    .select('id').eq('member_id', member_id).eq('minyan_id', minyan_id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, already: true });

  const { data: cfg } = await admin.from('rewards_config').select('*').eq('id', 1).single();
  const basePoints = cfg?.points_per_minyan ?? 8;

  const { data: dedication } = await admin
    .from('dedications').select('id').eq('minyan_id', minyan_id).maybeSingle();
  const bonus = dedication ? (cfg?.points_per_sponsored_bonus ?? 4) : 0;

  const { count: yesCount } = await admin.from('commitments')
    .select('*', { count: 'exact', head: true })
    .eq('minyan_id', minyan_id).eq('status', 'yes');
  const wasRescue = !member.is_teen && (yesCount ?? 0) < minyan.threshold;
  const rescuePoints = wasRescue ? (cfg?.points_per_rescue ?? 40) : 0;

  const totalPoints = member.is_teen ? basePoints + bonus : rescuePoints;

  const { data: att, error: attErr } = await admin.from('attendance').insert({
    member_id,
    minyan_id,
    checked_in_at: new Date().toISOString(),
    checked_in_by: 'gabbai',
    gabbai_id: gabbai.id,
    points_awarded: totalPoints,
    was_rescue: wasRescue,
    was_sponsored_minyan: !!dedication
  }).select('id').single();
  if (attErr) return NextResponse.json({ error: attErr.message }, { status: 500 });

  const ledgerRows = [];
  if (member.is_teen) {
    ledgerRows.push({
      member_id, points: basePoints, reason: 'attendance',
      reference_id: att.id,
      description: `${minyan.minyan_type} · ${minyan.display_time} (gabbai check-in)`
    });
    if (bonus) {
      ledgerRows.push({ member_id, points: bonus, reason: 'sponsored_bonus', reference_id: att.id, description: 'Sponsored bonus' });
    }
  } else if (wasRescue) {
    ledgerRows.push({ member_id, points: rescuePoints, reason: 'rescue_bonus', reference_id: att.id, description: 'Rescue response' });
  }

  if (ledgerRows.length) await admin.from('points_ledger').insert(ledgerRows);

  if (member.is_teen) {
    await awardStreakBonuses(member.id, att.id);
  }

  return NextResponse.json({ ok: true });
}
