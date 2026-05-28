import { supabaseAdmin } from './supabase';

// Returns the current attendance streak for a member in days
// (consecutive days with at least one minyan)
export async function computeStreak(memberId: string): Promise<number> {
  const admin = supabaseAdmin();
  const { data } = await admin.from('attendance')
    .select('checked_in_at')
    .eq('member_id', memberId)
    .order('checked_in_at', { ascending: false })
    .limit(100);

  if (!data || data.length === 0) return 0;

  const days = new Set<string>();
  for (const row of data) {
    const d = new Date(row.checked_in_at);
    days.add(d.toISOString().slice(0, 10));
  }

  // Walk backwards from today; allow today OR yesterday as the starting point
  const today = new Date();
  let cursor = new Date(today);
  let streak = 0;
  const cursorStr = cursor.toISOString().slice(0, 10);
  const yesterdayStr = new Date(today.getTime() - 86400_000).toISOString().slice(0, 10);

  if (!days.has(cursorStr) && !days.has(yesterdayStr)) return 0;
  if (!days.has(cursorStr)) cursor = new Date(today.getTime() - 86400_000);

  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400_000);
  }
  return streak;
}

// Award streak bonuses if they hit a milestone. Called after check-in.
export async function awardStreakBonuses(memberId: string, attendanceId: string) {
  const admin = supabaseAdmin();
  const streak = await computeStreak(memberId);
  const { data: cfg } = await admin.from('rewards_config').select('*').eq('id', 1).single();
  if (!cfg) return;

  // Check if we've already awarded this milestone in the last 7 days
  const bonuses: Array<{ days: number; points: number; reason: string }> = [
    { days: 7, points: cfg.points_per_streak_7, reason: 'streak_7' },
    { days: 30, points: cfg.points_per_streak_30, reason: 'streak_30' }
  ];

  for (const b of bonuses) {
    if (streak !== b.days) continue;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: already } = await admin.from('points_ledger')
      .select('id').eq('member_id', memberId).eq('reason', b.reason)
      .gte('created_at', sevenDaysAgo).maybeSingle();
    if (already) continue;

    await admin.from('points_ledger').insert({
      member_id: memberId,
      points: b.points,
      reason: b.reason,
      reference_id: attendanceId,
      description: `${b.days}-day streak bonus`
    });
  }
}
