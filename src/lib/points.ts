export interface PointAward {
  points: number;
  reason: string;
  description: string;
}

// Teen attendance scoring. Adults earn nothing (recognition only).
// Base 1 pt (3 for a sponsored/yahrzeit minyan), +0.5 for committing "yes" 12h+
// ahead and attending, +1 per attendance once the streak passes 3 days.
export function attendanceAwards(opts: {
  isTeen: boolean;
  hasDedication: boolean;
  committedEarly: boolean;
  streakAfter: number;
  label: string;
}): PointAward[] {
  if (!opts.isTeen) return [];

  const awards: PointAward[] = [{
    points: opts.hasDedication ? 3 : 1,
    reason: 'attendance',
    description: opts.hasDedication ? `${opts.label} (sponsored)` : opts.label
  }];

  if (opts.committedEarly) {
    awards.push({ points: 0.5, reason: 'early_commit', description: 'Committed 12+ hrs ahead' });
  }
  if (opts.streakAfter > 3) {
    awards.push({ points: 1, reason: 'streak_bonus', description: `${opts.streakAfter}-day streak` });
  }
  return awards;
}
