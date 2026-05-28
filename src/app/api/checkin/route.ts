import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase';
import { awardStreakBonuses } from '@/lib/streaks';

export async function POST(req: NextRequest) {
  const { minyan_id } = await req.json();
  if (!minyan_id) return NextResponse.json({ error: 'minyan_id required' }, { status: 400 });

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: member } = await sb.from('members').select('*').eq('auth_user_id', user.id).single();
  if (!member) return NextResponse.json({ error: 'no member record' }, { status: 403 });

  // Validate: minyan exists, in window, not already checked in
  const { data: minyan } = await sb.from('minyanim').select('*').eq('id', minyan_id).single();
  if (!minyan) return NextResponse.json({ error: 'minyan not found' }, { status: 404 });

  const now = new Date();
  const start = new Date(minyan.start_time);
  const windowStart = new Date(start.getTime() - 15 * 60 * 1000);
  const windowEnd = new Date(start.getTime() + 45 * 60 * 1000);
  if (now < windowStart || now > windowEnd) {
    return NextResponse.json({ error: 'Check-in window closed' }, { status: 400 });
  }

  const { data: existing } = await sb.from('attendance')
    .select('id').eq('member_id', member.id).eq('minyan_id', minyan_id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, already: true });

  // Use admin to write points ledger atomically
  const admin = supabaseAdmin();

  // Fetch rewards config
  const { data: cfg } = await admin.from('rewards_config').select('*').eq('id', 1).single();
  const basePoints = cfg?.points_per_minyan ?? 8;

  // Is sponsored?
  const { data: dedication } = await admin
    .from('dedications').select('id').eq('minyan_id', minyan_id).maybeSingle();
  const bonus = dedication ? (cfg?.points_per_sponsored_bonus ?? 4) : 0;

  // Detect "rescue": if count was below threshold at start of today, adult check-in counts as rescue
  // Simplified rule: below threshold minus 1, and member isn't a teen
  const { count: yesCount } = await admin.from('commitments')
    .select('*', { count: 'exact', head: true })
    .eq('minyan_id', minyan_id).eq('status', 'yes');
  const wasRescue = !member.is_teen && (yesCount ?? 0) < minyan.threshold;
  const rescuePoints = wasRescue ? (cfg?.points_per_rescue ?? 40) : 0;

  const totalPoints = member.is_teen ? basePoints + bonus : rescuePoints;

  // Insert attendance
  const { data: att, error: attErr } = await admin.from('attendance').insert({
    member_id: member.id,
    minyan_id,
    checked_in_at: now.toISOString(),
    checked_in_by: 'self',
    points_awarded: totalPoints,
    was_rescue: wasRescue,
    was_sponsored_minyan: !!dedication
  }).select('id').single();
  if (attErr) return NextResponse.json({ error: attErr.message }, { status: 500 });

  // Write to ledger (teens earn base; adults earn only on rescue)
  const ledgerRows = [];
  if (member.is_teen) {
    ledgerRows.push({
      member_id: member.id,
      points: basePoints,
      reason: 'attendance',
      reference_id: att.id,
      description: `${minyan.minyan_type} · ${minyan.display_time}`
    });
    if (bonus) {
      ledgerRows.push({
        member_id: member.id,
        points: bonus,
        reason: 'sponsored_bonus',
        reference_id: att.id,
        description: 'Sponsored minyan bonus'
      });
    }
  } else if (wasRescue) {
    ledgerRows.push({
      member_id: member.id,
      points: rescuePoints,
      reason: 'rescue_bonus',
      reference_id: att.id,
      description: 'Answered the call'
    });
  }

  if (ledgerRows.length) {
    await admin.from('points_ledger').insert(ledgerRows);
  }

  // Check for streak milestones (teens only)
  if (member.is_teen) {
    await awardStreakBonuses(member.id, att.id);
  }

  return NextResponse.json({ ok: true, points: totalPoints, rescue: wasRescue });
}
