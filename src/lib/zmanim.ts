import { supabaseAdmin } from './supabase';
import { nyWallClockToUTC } from './time';

interface HebcalItem {
  title: string;
  date: string;
  category: string;
  hebrew?: string;
}

// Sunset for a date (used for Sunday Mincha/Maariv).
async function getSunset(date: string): Promise<Date | null> {
  const geoname = process.env.HEBCAL_GEONAMEID || '5101798';
  const url = `https://www.hebcal.com/zmanim?cfg=json&date=${date}&geonameid=${geoname}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.times?.sunset ? new Date(data.times.sunset) : null;
}

// Yom tov / shabbat dates — we skip automated weekday minyanim on these.
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
    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York'
  });
}

function roundToNearestFive(d: Date): Date {
  const copy = new Date(d);
  copy.setMinutes(Math.round(copy.getMinutes() / 5) * 5, 0, 0);
  return copy;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekday(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay(); // 0=Sun .. 6=Sat
}

// Builds the next 14 days of weekday minyanim and upserts them.
// Shacharit: Sunday 8 AM, Mon-Fri 7 AM. Evening: Sunday Mincha/Maariv before
// sunset (Hebcal), Mon-Thu 9 PM Maariv, no Friday evening. Saturday and Yom Tov
// are skipped (the gabbai sets those manually). Shared by the nightly cron and
// the gabbai "Refresh" button.
export async function syncSchedule() {
  const admin = supabaseAdmin();
  const restricted = await getRestrictedDays();
  const startStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const results: { date: string; type: string; time: string }[] = [];

  async function upsert(dateStr: string, type: 'shacharit' | 'mincha_maariv', start: Date) {
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

  for (let i = 0; i < 14; i++) {
    const dateStr = addDays(startStr, i);
    const dow = weekday(dateStr);
    if (dow === 6) continue;                // Saturday / Shabbat
    if (restricted.has(dateStr)) continue;  // Yom Tov — set manually

    // Shacharit: Sunday 8:00 AM, Mon-Fri 7:00 AM
    await upsert(dateStr, 'shacharit', nyWallClockToUTC(dateStr, dow === 0 ? 8 : 7, 0));

    if (dow === 0) {
      // Sunday: Mincha/Maariv ~10 min before sunset
      const sunset = await getSunset(dateStr);
      if (sunset) {
        await upsert(dateStr, 'mincha_maariv', roundToNearestFive(new Date(sunset.getTime() - 10 * 60 * 1000)));
      }
    } else if (dow >= 1 && dow <= 4) {
      // Mon-Thu: fixed 9:00 PM Maariv
      await upsert(dateStr, 'mincha_maariv', nyWallClockToUTC(dateStr, 21, 0));
    }
    // Friday (dow === 5): Shacharit only
  }

  return results;
}
