import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase';

// Links a freshly-authenticated phone user to their existing member row.
// Runs server-side with the service-role key so it can read/update the
// member row before auth_user_id is set (RLS would otherwise block it).
export async function POST() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: 'not_authenticated' }, { status: 401 });
  }

  const admin = supabaseAdmin();

  // Already linked on a previous login.
  const { data: linked } = await admin
    .from('members')
    .select('id, active')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (linked) {
    if (!linked.active) {
      return NextResponse.json({ ok: false, reason: 'inactive' }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  }

  // First login: match by phone. Members are stored E.164 with a leading '+'
  // (e.g. +12015550123); Supabase stores the auth phone without it (12015550123).
  const digits = (user.phone || '').replace(/\D/g, '');
  if (!digits) {
    return NextResponse.json({ ok: false, reason: 'no_phone' }, { status: 400 });
  }

  let { data: member } = await admin
    .from('members')
    .select('id, active, auth_user_id')
    .eq('phone', `+${digits}`)
    .maybeSingle();
  if (!member) {
    ({ data: member } = await admin
      .from('members')
      .select('id, active, auth_user_id')
      .eq('phone', digits)
      .maybeSingle());
  }

  if (!member) {
    return NextResponse.json({ ok: false, reason: 'not_registered' }, { status: 404 });
  }
  if (!member.active) {
    return NextResponse.json({ ok: false, reason: 'inactive' }, { status: 403 });
  }
  if (member.auth_user_id && member.auth_user_id !== user.id) {
    return NextResponse.json({ ok: false, reason: 'already_claimed' }, { status: 409 });
  }

  const { error: updateError } = await admin
    .from('members')
    .update({ auth_user_id: user.id })
    .eq('id', member.id);
  if (updateError) {
    return NextResponse.json({ ok: false, reason: 'link_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
