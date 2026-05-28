'use client';
import Link from 'next/link';
import type { UpcomingMinyan } from '@/lib/types';

export function CommitCard({
  minyan,
  myStatus,
  extraLine
}: {
  minyan: UpcomingMinyan;
  myStatus?: 'yes' | 'no' | 'maybe';
  extraLine?: string;
}) {
  const d = new Date(minyan.start_time);
  const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long' });
  const typeWord = minyan.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv';
  const below = minyan.yes_count < minyan.threshold;

  let sub = extraLine;
  if (!sub) {
    if (myStatus === 'yes') sub = `You're in. ${minyan.yes_count} committed so far.`;
    else if (below) sub = `${minyan.threshold - minyan.yes_count} more needed.`;
    else sub = `${minyan.yes_count} committed — we're good.`;
  }

  return (
    <Link
      href={`/commit/${minyan.id}`}
      className="block relative overflow-hidden bg-gradient-to-br from-ink to-ink-soft rounded-xl p-4 my-3.5 active:scale-[0.99] transition-transform"
    >
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(217,193,148,0.18) 0%, transparent 70%)' }}
      />
      <div className="relative">
        <div className="font-serif text-[15px] font-medium text-cream">
          {dayLabel} {typeWord} · {minyan.display_time}
        </div>
        <div className="text-[11px] text-cream/65 mt-1 mb-3">{sub}</div>
        <div className="flex gap-1.5">
          <div
            className={`flex-1 py-2.5 px-1 rounded-lg text-[10px] font-semibold text-center tracking-wide ${
              myStatus === 'yes'
                ? 'bg-gold text-ink'
                : 'bg-white/8 text-cream border border-white/15'
            }`}
          >
            I'm coming
          </div>
          <div className={`flex-1 py-2.5 px-1 rounded-lg text-[10px] font-semibold text-center tracking-wide ${
            myStatus === 'no' ? 'bg-alert text-cream' : 'bg-white/8 text-cream border border-white/15'
          }`}>
            Can't make it
          </div>
          <div className={`flex-1 py-2.5 px-1 rounded-lg text-[10px] font-semibold text-center tracking-wide ${
            myStatus === 'maybe' ? 'bg-amber text-ink' : 'bg-white/8 text-cream border border-white/15'
          }`}>
            Maybe
          </div>
        </div>
      </div>
    </Link>
  );
}
