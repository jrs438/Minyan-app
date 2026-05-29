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
