import { supabaseAdmin } from './supabase';

function nyDateStr(d: Date): string {
  // en-CA renders as YYYY-MM-DD; bucket by the New York calendar day.
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

// Returns the current attendance streak for a member in days. Days that had no
// minyan (Shabbat / Yom Tov, when the app is read-only) are "freebies": they
// neither extend the streak nor break it.
export async function computeStreak(memberId: string): Promise<number> {
  const admin = supabaseAdmin();
  const { data } = await admin.from('attendance')
    .select('checked_in_at')
    .eq('member_id', memberId)
    .order('checked_in_at', { ascending: false })
    .limit(200);

  if (!data || data.length === 0) return 0;

  const attendedDays = new Set<string>();
  for (const row of data) attendedDays.add(nyDateStr(new Date(row.checked_in_at)));

  const earliestAttended = nyDateStr(new Date(data[data.length - 1].checked_in_at));

  // Days that actually had a minyan scheduled — missing one of these breaks the
  // streak. A day with no minyan (Shabbat / Yom Tov) is skipped without penalty.
  const { data: minyanRows } = await admin.from('minyanim')
    .select('service_date')
    .gte('service_date', earliestAttended);
  const minyanDays = new Set<string>((minyanRows || []).map(r => r.service_date as string));

  // Start from today, or yesterday if nothing is logged yet today.
  let cursor = new Date();
  const todayStr = nyDateStr(cursor);
  const yesterdayStr = nyDateStr(new Date(cursor.getTime() - 86400_000));
  if (!attendedDays.has(todayStr) && !attendedDays.has(yesterdayStr)) return 0;
  if (!attendedDays.has(todayStr)) cursor = new Date(cursor.getTime() - 86400_000);

  let streak = 0;
  while (nyDateStr(cursor) >= earliestAttended) {
    const dayStr = nyDateStr(cursor);
    if (attendedDays.has(dayStr)) streak++;
    else if (minyanDays.has(dayStr)) break;
    cursor = new Date(cursor.getTime() - 86400_000);
  }
  return streak;
}
