import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase';

// Links a freshly-authenticated user to their existing member row, by email
// first (the new primary identifier) and phone as a fallback. Runs server-side
// with the service role so it can read/update before auth_user_id is set
// (RLS would otherwise block it). Always overwrites auth_user_id on a match —
// that's what lets a member who originally signed up by phone seamlessly switch
// to email login without losing their history.
export async function POST() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: 'not_authenticated' }, { status: 401 });
  }

  const admin = supabaseAdmin();

  // Already linked? Quick path.
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

  // Match by email first (best identifier for the email-login flow).
  let member: { id: string; active: boolean } | null = null;
  const email = user.email?.toLowerCase().trim();
  if (email) {
    const { data } = await admin
      .from('members')
      .select('id, active')
      .ilike('email', email)
      .maybeSingle();
    member = data ?? null;
  }

  // Fall back to phone (members are stored as E.164 with +, auth strips the +).
  if (!member && user.phone) {
    const digits = user.phone.replace(/\D/g, '');
    let { data } = await admin
      .from('members')
      .select('id, active')
      .eq('phone', `+${digits}`)
      .maybeSingle();
    if (!data) {
      ({ data } = await admin
        .from('members')
        .select('id, active')
        .eq('phone', digits)
        .maybeSingle());
    }
    member = data ?? null;
  }

  if (!member) {
    return NextResponse.json({ ok: false, reason: 'not_registered' }, { status: 404 });
  }
  if (!member.active) {
    return NextResponse.json({ ok: false, reason: 'inactive' }, { status: 403 });
  }

  // Claim (or re-claim) the member row for this auth user.
  const { error: updateError } = await admin
    .from('members')
    .update({ auth_user_id: user.id })
    .eq('id', member.id);
  if (updateError) {
    return NextResponse.json({ ok: false, reason: 'link_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

