import Link from 'next/link';
import type { UpcomingMinyan } from '@/lib/types';

export function SponsoredCard({ minyan }: { minyan: UpcomingMinyan }) {
  const d = new Date(minyan.start_time);
  const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long' });
  const dedi = minyan.dedication!;
  const typeWord = minyan.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv';

  return (
    <Link
      href={`/commit/${minyan.id}`}
      className="block bg-gradient-to-br from-parchment to-cream-warm border-[1.5px] border-gold rounded-xl p-3.5 mb-3.5"
    >
      <div className="font-mono text-[9px] tracking-[0.2em] text-gold-deep font-bold mb-1.5">
        ✡ DEDICATED MINYAN
      </div>
      <div className="font-serif text-[17px] font-semibold text-ink leading-tight mb-1">
        {dayLabel} {typeWord} · {minyan.display_time}
      </div>
      <div className="font-serif italic text-[13px] text-ink-soft leading-snug mb-2">
        {dedi.is_yahrzeit && '🕯️ '}
        {dedi.dedication_type === 'memory' && 'In memory of '}
        {dedi.dedication_type === 'honor' && 'In honor of '}
        {dedi.dedication_type === 'refuah' && 'For a refuah shleima for '}
        {dedi.dedication_text}
        {dedi.is_yahrzeit && ' — yahrzeit'}
      </div>
      <div className="flex justify-between items-center text-[10px] text-muted italic">
        <span>{dedi.sponsor_display_name ? `Sponsored by ${dedi.sponsor_display_name}` : 'Sponsored'}</span>
        <span className="bg-amber/15 text-amber px-2 py-1 rounded-full font-mono font-semibold not-italic">
          {minyan.yes_count} / {minyan.threshold}
        </span>
      </div>
    </Link>
  );
}
