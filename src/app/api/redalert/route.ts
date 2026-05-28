import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { data: gabbai } = await sb.from('members').select('*').eq('auth_user_id', user.id).single();
  if (!gabbai || (gabbai.role !== 'gabbai' && gabbai.role !== 'admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { minyan_id } = await req.json();
  const admin = supabaseAdmin();

  const { data: minyan } = await admin.from('minyanim').select('*').eq('id', minyan_id).single();
  if (!minyan) return NextResponse.json({ error: 'minyan not found' }, { status: 404 });

  const { data: dedication } = await admin.from('dedications')
    .select('dedication_text, is_yahrzeit').eq('minyan_id', minyan_id).maybeSingle();

  const { count: yesCount } = await admin.from('commitments')
    .select('*', { count: 'exact', head: true })
    .eq('minyan_id', minyan_id).eq('status', 'yes');

  const needed = minyan.threshold - (yesCount ?? 0);
  const d = new Date(minyan.start_time);
  const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long' });
  const typeWord = minyan.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv';
  let body = `Minyan alert: ${dayLabel} ${typeWord} at ${minyan.display_time} needs ${needed} more.`;
  if (dedication?.is_yahrzeit) body += ' This is a yahrzeit minyan.';
  else if (dedication) body += ` (Dedicated: ${dedication.dedication_text})`;
  body += ' Open the app to commit.';

  // Audience: members who opted in + are not already committed yes + active
  const { data: candidates } = await admin.from('members')
    .select('id, phone, first_name').eq('active', true).eq('notif_red_alert', true).eq('can_be_called', true);

  // Exclude those already committed yes
  const { data: yesCommits } = await admin.from('commitments')
    .select('member_id').eq('minyan_id', minyan_id).eq('status', 'yes');
  const yesSet = new Set((yesCommits || []).map(c => c.member_id));
  const recipients = (candidates || []).filter(c => !yesSet.has(c.id));

  // Send SMS via Twilio (if env configured)
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNum = process.env.TWILIO_FROM_NUMBER;
  let sent = 0;

  if (accountSid && authToken && fromNum) {
    const client = twilio(accountSid, authToken);
    for (const r of recipients) {
      try {
        await client.messages.create({ to: r.phone, from: fromNum, body });
        sent++;
        await admin.from('notifications_sent').insert({
          member_id: r.id,
          channel: 'sms',
          category: 'red_alert',
          reference_id: minyan_id,
          body,
          success: true
        });
      } catch (err: any) {
        await admin.from('notifications_sent').insert({
          member_id: r.id,
          channel: 'sms',
          category: 'red_alert',
          reference_id: minyan_id,
          body,
          success: false,
          error_message: err.message
        });
      }
    }
  }

  return NextResponse.json({ ok: true, recipients: recipients.length, sent });
}
