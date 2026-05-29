import Link from 'next/link';
import type { UpcomingMinyan } from '@/lib/types';
import { formatServiceDate, nyTodayDateStr, addDaysStr } from '@/lib/time';

function formatWhen(m: UpcomingMinyan): string {
  const today = nyTodayDateStr();
  const day =
    m.service_date === today ? 'Today'
    : m.service_date === addDaysStr(today, 1) ? 'Tomorrow'
    : formatServiceDate(m.service_date, { weekday: 'short' });
  return `${day} · ${m.display_time}`;
}

export function MinyanLine({
  minyan,
  myStatus
}: {
  minyan: UpcomingMinyan;
  myStatus?: 'yes' | 'no' | 'maybe';
}) {
  const count = minyan.yes_count;
  const threshold = minyan.threshold;

  let pillClass = 'bg-ok/10 text-ok';
  let pillIcon = '✓';
  if (count < threshold - 2) {
    pillClass = 'bg-alert/10 text-alert';
    pillIcon = '';
  } else if (count < threshold) {
    pillClass = 'bg-amber/15 text-amber';
    pillIcon = '⚠';
  }

  const typeLabel = minyan.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv';
  const myStatusBadge = myStatus === 'yes' ? '✓ You' : myStatus === 'no' ? 'You: out' : myStatus === 'maybe' ? 'You: maybe' : null;

  return (
    <Link
      href={`/commit/${minyan.id}`}
      className="flex justify-between items-center py-3 border-b border-black/5 last:border-b-0 active:bg-black/2"
    >
      <div className="min-w-0">
        <div className="font-serif text-lg font-medium text-ink leading-tight">{typeLabel}</div>
        <div className="text-[11px] text-ink-light mt-0.5">{formatWhen(minyan)}</div>
        {myStatusBadge && (
          <div className="text-[10px] text-gold-deep font-medium mt-0.5">{myStatusBadge}</div>
        )}
      </div>
      <div
        className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold flex items-center gap-1 ${pillClass}`}
      >
        <span>{count} / {threshold}</span>
        {pillIcon && <span>{pillIcon}</span>}
      </div>
    </Link>
  );
}
