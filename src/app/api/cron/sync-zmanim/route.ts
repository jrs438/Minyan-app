import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  return secret && auth === `Bearer ${secret}`;
}

interface HebcalItem {
  title: string;
  date: string;
  category: string;
  hebrew?: string;
}

// Fetches sunrise/sunset from Hebcal for a given date
async function getZmanim(date: string) {
  const geoname = process.env.HEBCAL_GEONAMEID || '5101798';
  const url = `https://www.hebcal.com/zmanim?cfg=json&date=${date}&geonameid=${geoname}`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    sunrise: data.times?.sunrise ? new Date(data.times.sunrise) : null,
    shkiah: data.times?.sunset ? new Date(data.times.sunset) : null,
    plag: data.times?.plagHaMincha ? new Date(data.times.plagHaMincha) : null
  };
}

// Fetches yom tov / shabbat flags for a date range
async function getRestrictedDays(): Promise<Set<string>> {
  const geoname = process.env.HEBCAL_GEONAMEID || '5101798';
  const now = new Date();
  const url = `https://www.hebcal.com/hebcal?cfg=json&v=1&geonameid=${geoname}&maj=on&min=off&mod=on&nx=off&month=x&year=${now.getFullYear()}&s=on&c=on&m=50`;
  const res = await fetch(url);
  const data = await res.json();
  const set = new Set<string>();
  for (const item of (data.items || []) as HebcalItem[]) {
    if (item.category === 'holiday' && item.title !== 'Rosh Chodesh') {
      set.add(item.date.slice(0, 10));
    }
    if (item.category === 'candles' || item.category === 'havdalah') {
      set.add(item.date.slice(0, 10));
    }
  }
  return set;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  });
}

function roundToNearestFive(d: Date): Date {
  const copy = new Date(d);
  const mins = copy.getMinutes();
  const rounded = Math.round(mins / 5) * 5;
  copy.setMinutes(rounded, 0, 0);
  return copy;
}

export async function GET(req: NextRequest) { return POST(req); }

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = supabaseAdmin();
  const restricted = await getRestrictedDays();

  const today = new Date();
  const results = [];

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    const isShabbatYomTov = restricted.has(dateStr) || date.getDay() === 6;

    if (isShabbatYomTov) continue; // no automated weekday minyanim on shabbat/yom tov

    const { sunrise, shkiah } = await getZmanim(dateStr);
    if (!sunrise || !shkiah) continue;

    // Shacharit rule: 45 min before sunrise, rounded to nearest 5 min
    // You can override this per-shul by changing the formula
    const shacharit = roundToNearestFive(new Date(sunrise.getTime() - 45 * 60 * 1000));
    const minchaMaariv = roundToNearestFive(new Date(shkiah.getTime() - 10 * 60 * 1000));

    for (const [type, start] of [['shacharit', shacharit], ['mincha_maariv', minchaMaariv]] as const) {
      await admin.from('minyanim').upsert({
        service_date: dateStr,
        minyan_type: type,
        start_time: start.toISOString(),
        display_time: formatTime(start),
        is_shabbat_or_yomtov: false,
        threshold: 10
      }, { onConflict: 'service_date,minyan_type' });
      results.push({ date: dateStr, type, time: formatTime(start) });
    }
  }

  return NextResponse.json({ ok: true, scheduled: results.length, sample: results.slice(0, 5) });
}
