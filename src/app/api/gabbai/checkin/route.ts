import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase';
import { computeStreak } from '@/lib/streaks';
import { attendanceAwards } from '@/lib/points';

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

  const { data: dedication } = await admin
    .from('dedications').select('id').eq('minyan_id', minyan_id).maybeSingle();
  const hasDedication = !!dedication;

  const start = new Date(minyan.start_time);
  const { data: commit } = await admin.from('commitments')
    .select('status, responded_at').eq('member_id', member_id).eq('minyan_id', minyan_id).maybeSingle();
  const committedEarly = commit?.status === 'yes'
    && (start.getTime() - new Date(commit.responded_at).getTime()) > 12 * 60 * 60 * 1000;

  const { data: att, error: attErr } = await admin.from('attendance').insert({
    member_id, minyan_id, checked_in_at: new Date().toISOString(),
    checked_in_by: 'gabbai', gabbai_id: gabbai.id, points_awarded: 0, was_sponsored_minyan: hasDedication
  }).select('id').single();
  if (attErr) return NextResponse.json({ error: attErr.message }, { status: 500 });

  const earnsPoints = member.is_teen || member.role === 'preteen';
  const streakAfter = earnsPoints ? await computeStreak(member_id) : 0;
  const awards = attendanceAwards({
    earnsPoints, hasDedication, committedEarly, streakAfter,
    label: `${minyan.minyan_type} · ${minyan.display_time}`
  });
  const total = awards.reduce((s, a) => s + a.points, 0);

  if (awards.length) {
    await admin.from('points_ledger').insert(
      awards.map(a => ({ member_id, points: a.points, reason: a.reason, reference_id: att.id, description: a.description }))
    );
    await admin.from('attendance').update({ points_awarded: total }).eq('id', att.id);
  }

  return NextResponse.json({ ok: true, points: total });
}
