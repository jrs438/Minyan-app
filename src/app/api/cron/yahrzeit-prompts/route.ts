import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import twilio from 'twilio';

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization');
  return process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
}

// Fetches upcoming Hebcal dates and converts to Gregorian
async function hebcalLookup(hebrewDate: string): Promise<string | null> {
  // hebrewDate format like "14 Adar" — use Hebcal converter
  // For simplicity: use their HebCal API with hebrew=on
  try {
    const url = `https://www.hebcal.com/converter?cfg=json&hdm=${encodeURIComponent(hebrewDate)}&h2g=1&strict=1`;
    const res = await fetch(url);
    const data = await res.json();
    return data.gy && data.gm && data.gd
      ? `${data.gy}-${String(data.gm).padStart(2, '0')}-${String(data.gd).padStart(2, '0')}`
      : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) { return POST(req); }

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: yahrzeits } = await admin
    .from('yahrzeits')
    .select('*, members!inner(id, phone, first_name, notif_rewards)');
  if (!yahrzeits) return NextResponse.json({ ok: true, none: true });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNum = process.env.TWILIO_FROM_NUMBER;
  const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

  const today = new Date();
  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const targetDate = sevenDaysOut.toISOString().slice(0, 10);

  let sent = 0;
  for (const y of yahrzeits as any[]) {
    const gregorian = await hebcalLookup(y.hebrew_date);
    if (gregorian !== targetDate) continue;

    // Dedup: check if already sent this year
    const year = sevenDaysOut.getFullYear();
    const { data: already } = await admin.from('notifications_sent')
      .select('id').eq('member_id', y.family_member_id)
      .eq('category', 'yahrzeit_prompt').eq('reference_id', y.id)
      .gte('sent_at', `${year}-01-01`).maybeSingle();
    if (already) continue;

    const body = `${y.deceased_name}'s yahrzeit is 7 days away (${y.hebrew_date}). Sponsor the minyan in their memory: ${appUrl}/yahrzeit/${y.id}`;
    if (client && fromNum) {
      try {
        await client.messages.create({ to: y.members.phone, from: fromNum, body });
        sent++;
        await admin.from('notifications_sent').insert({
          member_id: y.family_member_id,
          channel: 'sms',
          category: 'yahrzeit_prompt',
          reference_id: y.id,
          body,
          success: true
        });
      } catch (err: any) {
        await admin.from('notifications_sent').insert({
          member_id: y.family_member_id,
          channel: 'sms',
          category: 'yahrzeit_prompt',
          reference_id: y.id,
          body,
          success: false,
          error_message: err.message
        });
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
