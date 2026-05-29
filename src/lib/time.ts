// Convert a wall-clock time (hh:mm on serviceDate, YYYY-MM-DD) interpreted in
// America/New_York into the correct UTC instant, accounting for EST vs EDT.
export function nyWallClockToUTC(serviceDate: string, hh: number, mm: number): Date {
  const [y, mo, d] = serviceDate.split('-').map(Number);
  const asUTC = Date.UTC(y, mo - 1, d, hh, mm, 0);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(new Date(asUTC));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const nyAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return new Date(asUTC - (nyAsUTC - asUTC));
}

// Format a YYYY-MM-DD service date with the given options. Anchored at noon UTC
// and formatted in UTC so the calendar day never shifts — use this for day
// labels instead of start_time, which for evening minyanim lands on the next
// UTC day.
export function formatServiceDate(serviceDate: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${serviceDate}T12:00:00Z`).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
}

// Today's date (YYYY-MM-DD) in New York.
export function nyTodayDateStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
