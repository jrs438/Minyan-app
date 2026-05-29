import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase';
import { computeStreak } from '@/lib/streaks';
import { attendanceAwards } from '@/lib/points';

export async function POST(req: NextRequest) {
  const { minyan_id } = await req.json();
  if (!minyan_id) return NextResponse.json({ error: 'minyan_id required' }, { status: 400 });

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: member } = await sb.from('members').select('*').eq('auth_user_id', user.id).single();
  if (!member) return NextResponse.json({ error: 'no member record' }, { status: 403 });

  const { data: minyan } = await sb.from('minyanim').select('*').eq('id', minyan_id).single();
  if (!minyan) return NextResponse.json({ error: 'minyan not found' }, { status: 404 });

  const now = new Date();
  const start = new Date(minyan.start_time);
  if (now < new Date(start.getTime() - 15 * 60 * 1000) || now > new Date(start.getTime() + 45 * 60 * 1000)) {
    return NextResponse.json({ error: 'Check-in window closed' }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: existing } = await admin.from('attendance')
    .select('id').eq('member_id', member.id).eq('minyan_id', minyan_id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, already: true });

  const { data: dedication } = await admin
    .from('dedications').select('id').eq('minyan_id', minyan_id).maybeSingle();
  const hasDedication = !!dedication;

  // Did they commit "yes" more than 12 hours ahead?
  const { data: commit } = await admin.from('commitments')
    .select('status, responded_at').eq('member_id', member.id).eq('minyan_id', minyan_id).maybeSingle();
  const committedEarly = commit?.status === 'yes'
    && (start.getTime() - new Date(commit.responded_at).getTime()) > 12 * 60 * 60 * 1000;

  // Record attendance first so the streak count includes today.
  const { data: att, error: attErr } = await admin.from('attendance').insert({
    member_id: member.id, minyan_id, checked_in_at: now.toISOString(),
    checked_in_by: 'self', points_awarded: 0, was_sponsored_minyan: hasDedication
  }).select('id').single();
  if (attErr) return NextResponse.json({ error: attErr.message }, { status: 500 });

  const streakAfter = member.is_teen ? await computeStreak(member.id) : 0;
  const awards = attendanceAwards({
    isTeen: member.is_teen, hasDedication, committedEarly, streakAfter,
    label: `${minyan.minyan_type} · ${minyan.display_time}`
  });
  const total = awards.reduce((s, a) => s + a.points, 0);

  if (awards.length) {
    await admin.from('points_ledger').insert(
      awards.map(a => ({ member_id: member.id, points: a.points, reason: a.reason, reference_id: att.id, description: a.description }))
    );
    await admin.from('attendance').update({ points_awarded: total }).eq('id', att.id);
  }

  return NextResponse.json({ ok: true, points: total, streak: streakAfter });
}
