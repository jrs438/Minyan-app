// Fetches Shabbat & yom tov windows from Hebcal, caches for the day.
// Used by middleware to gate app access.

interface HebcalEvent {
  title: string;
  date: string;
  category: string;
  subcat?: string;
}

let cache: { fetchedAt: number; events: HebcalEvent[] } | null = null;

async function fetchHebcalEvents(): Promise<HebcalEvent[]> {
  if (cache && Date.now() - cache.fetchedAt < 6 * 60 * 60 * 1000) {
    return cache.events;
  }
  const geoname = process.env.HEBCAL_GEONAMEID || '5101798';
  const url = `https://www.hebcal.com/shabbat?cfg=json&geonameid=${geoname}&m=50`;
  try {
    const res = await fetch(url, { next: { revalidate: 21600 } });
    const data = await res.json();
    cache = { fetchedAt: Date.now(), events: data.items || [] };
    return cache.events;
  } catch {
    return [];
  }
}

export async function isCurrentlyShabbatOrYomTov(now = new Date()): Promise<{
  isRestricted: boolean;
  reason?: string;
  endsAt?: Date;
}> {
  const events = await fetchHebcalEvents();
  const candleLightings = events
    .filter(e => e.category === 'candles')
    .map(e => new Date(e.date));
  const havdalahs = events
    .filter(e => e.category === 'havdalah')
    .map(e => new Date(e.date));

  for (const lighting of candleLightings) {
    const nextHavdalah = havdalahs.find(h => h > lighting);
    if (!nextHavdalah) continue;
    if (now >= lighting && now < nextHavdalah) {
      const title = events.find(
        e => e.category === 'candles' && e.date === lighting.toISOString()
      )?.title || 'Shabbat';
      return { isRestricted: true, reason: title, endsAt: nextHavdalah };
    }
  }
  return { isRestricted: false };
}

export async function nextShabbatWindow(): Promise<{ start: Date; end: Date } | null> {
  const events = await fetchHebcalEvents();
  const nextCandles = events.find(e => e.category === 'candles' && new Date(e.date) > new Date());
  if (!nextCandles) return null;
  const start = new Date(nextCandles.date);
  const nextHavdalah = events.find(
    e => e.category === 'havdalah' && new Date(e.date) > start
  );
  if (!nextHavdalah) return null;
  return { start, end: new Date(nextHavdalah.date) };
}
