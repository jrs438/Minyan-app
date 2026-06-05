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

  // Audience: any active member who hasn't opted out of red-alert notifications
  // and isn't already committed yes.
  const { data: candidates } = await admin.from('members')
    .select('id, phone, first_name').eq('active', true).eq('notif_red_alert', true);

  // Exclude those already committed yes
  const { data: yesCommits } = await admin.from('commitments')
    .select('member_id').eq('minyan_id', minyan_id).eq('status', 'yes');
  const yesSet = new Set((yesCommits || []).map(c => c.member_id));
  const recipients = (candidates || []).filter(c => !yesSet.has(c.id));

  // Send SMS via Twilio (if env configured)
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNum = process.env.TWILIO_FROM_NUMBER;
  const twilioConfigured = !!(accountSid && authToken && fromNum);
  let queued = 0;
  let delivered = 0;
  let failed = 0;
  let firstError: string | null = null;
  const details: Array<{ phone: string; sid?: string; status?: string; errorCode?: number | null; errorMessage?: string | null }> = [];

  if (twilioConfigured) {
    const client = twilio(accountSid, authToken);
    for (const r of recipients) {
      try {
        let msg = await client.messages.create({ to: r.phone, from: fromNum, body });
        // Twilio status right after create() is usually 'queued' or 'accepted'.
        // Re-fetch once to catch immediate carrier failures (10DLC, blocked, etc.).
        try {
          msg = await client.messages(msg.sid).fetch();
        } catch { /* ignore fetch errors, keep create() result */ }

        queued++;
        if (msg.status === 'delivered') delivered++;
        if (msg.status === 'failed' || msg.status === 'undelivered') {
          failed++;
          if (!firstError) firstError = `Twilio ${msg.status}${msg.errorCode ? ` (${msg.errorCode})` : ''}: ${msg.errorMessage || 'no error message'}`;
        }
        details.push({
          phone: r.phone,
          sid: msg.sid,
          status: msg.status,
          errorCode: msg.errorCode ?? null,
          errorMessage: msg.errorMessage ?? null
        });
        await admin.from('notifications_sent').insert({
          member_id: r.id,
          channel: 'sms',
          category: 'red_alert',
          reference_id: minyan_id,
          body,
          success: msg.status !== 'failed' && msg.status !== 'undelivered',
          error_message: `sid=${msg.sid} status=${msg.status}${msg.errorCode ? ` err=${msg.errorCode}` : ''}`
        });
      } catch (err: any) {
        failed++;
        if (!firstError) firstError = err?.message || 'send failed';
        details.push({ phone: r.phone, errorMessage: err?.message });
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

  return NextResponse.json({
    ok: true,
    recipients: recipients.length,
    queued,
    delivered,
    failed,
    twilio_configured: twilioConfigured,
    first_error: firstError,
    details
  });
}
