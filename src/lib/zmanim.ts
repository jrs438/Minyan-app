import { supabaseAdmin } from './supabase';

interface HebcalItem {
  title: string;
  date: string;
  category: string;
  hebrew?: string;
}

// Fetches sunrise/sunset from Hebcal for a given date (returns absolute instants).
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

// Fetches yom tov / shabbat dates so we skip scheduling weekday minyanim on them.
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
  copy.setMinutes(Math.round(copy.getMinutes() / 5) * 5, 0, 0);
  return copy;
}

// Builds the next 14 days of weekday minyanim from Hebcal zmanim and upserts
// them. Shared by the nightly cron and the gabbai "Refresh" button.
export async function syncSchedule() {
  const admin = supabaseAdmin();
  const restricted = await getRestrictedDays();
  const today = new Date();
  const results: { date: string; type: string; time: string }[] = [];

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    const isShabbatYomTov = restricted.has(dateStr) || date.getDay() === 6;
    if (isShabbatYomTov) continue; // no automated weekday minyanim on shabbat/yom tov

    const { sunrise, shkiah } = await getZmanim(dateStr);
    if (!sunrise || !shkiah) continue;

    // Shacharit: 45 min before sunrise. Mincha/Maariv: 10 min before sunset. Rounded to 5.
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

  return results;
}
