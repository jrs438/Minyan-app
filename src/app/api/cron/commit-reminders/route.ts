import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import twilio from 'twilio';

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization');
  return process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) { return POST(req); }

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = supabaseAdmin();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  const { data: minyanim } = await admin.from('minyanim')
    .select('*').eq('service_date', dateStr);
  if (!minyanim || minyanim.length === 0) {
    return NextResponse.json({ ok: true, no_minyanim: true });
  }

  const { data: members } = await admin.from('members')
    .select('id, phone, first_name, notif_commit_reminder')
    .eq('active', true);

  const eligibleMembers = (members || []).filter(m => m.notif_commit_reminder);

  // For each minyan, find who hasn't committed and send a reminder
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNum = process.env.TWILIO_FROM_NUMBER;
  const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

  let sent = 0;

  for (const m of minyanim) {
    const { data: commits } = await admin.from('commitments')
      .select('member_id').eq('minyan_id', m.id);
    const committedSet = new Set((commits || []).map(c => c.member_id));

    const uncommitted = eligibleMembers.filter(mem => !committedSet.has(mem.id));
    const typeWord = m.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    for (const mem of uncommitted) {
      // Send only 1 reminder per minyan per member (check notifications_sent)
      const { data: already } = await admin.from('notifications_sent')
        .select('id').eq('member_id', mem.id).eq('category', 'commit_reminder')
        .eq('reference_id', m.id).maybeSingle();
      if (already) continue;

      const body = `Tomorrow's ${typeWord} at ${m.display_time} — let us know if you can come. ${appUrl}/commit/${m.id}`;

      if (client && fromNum) {
        try {
          await client.messages.create({ to: mem.phone, from: fromNum, body });
          sent++;
          await admin.from('notifications_sent').insert({
            member_id: mem.id, channel: 'sms',
            category: 'commit_reminder', reference_id: m.id, body, success: true
          });
        } catch (err: any) {
          await admin.from('notifications_sent').insert({
            member_id: mem.id, channel: 'sms',
            category: 'commit_reminder', reference_id: m.id, body,
            success: false, error_message: err.message
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
