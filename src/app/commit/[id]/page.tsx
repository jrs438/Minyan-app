import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { CommitActions } from '@/components/CommitActions';
import type { UpcomingMinyan } from '@/lib/types';
import { formatServiceDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function CommitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');

  const sb = await supabaseServer();
  const { data: minyan } = await sb
    .from('v_upcoming_minyanim')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!minyan) notFound();
  const m = minyan as UpcomingMinyan;

  const { data: myCommit } = await sb
    .from('commitments')
    .select('status, needs_ride')
    .eq('member_id', member.id)
    .eq('minyan_id', id)
    .maybeSingle();

  const dayLabel = formatServiceDate(m.service_date, { weekday: 'long', month: 'short', day: 'numeric' });
  const typeWord = m.minyan_type === 'shacharit' ? 'Shacharit' : 'Mincha/Maariv';
  const below = m.yes_count < m.threshold;

  return (
    <div className="min-h-screen bg-parchment pt-safe">
      <div className="px-5 py-4">
        <Link href="/home" className="text-sm text-muted">‹ Back to Home</Link>
      </div>

      <div className="px-5 pt-4">
        <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-gold-deep mb-2">
          {dayLabel}
        </div>
        <h1 className="font-serif text-3xl text-ink leading-tight mb-1">
          {typeWord} · {m.display_time}
        </h1>

        {m.has_dedication && m.dedication && (
          <div className="mt-4 bg-cream-warm border border-gold rounded-xl p-3.5">
            <div className="font-mono text-[9px] tracking-[0.2em] text-gold-deep font-bold mb-1.5">
              ✡ DEDICATED
            </div>
            <div className="font-serif italic text-[14px] text-ink-soft">
              {m.dedication.is_yahrzeit && '🕯️ '}
              {m.dedication.dedication_type === 'memory' && 'In memory of '}
              {m.dedication.dedication_type === 'honor' && 'In honor of '}
              {m.dedication.dedication_type === 'refuah' && 'For a refuah shleima for '}
              {m.dedication.dedication_text}
            </div>
            {m.dedication.sponsor_display_name && (
              <div className="text-[10px] text-muted italic mt-1">
                Sponsored by {m.dedication.sponsor_display_name}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-between items-baseline">
          <div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-muted">
              Committed
            </div>
            <div className="font-serif text-3xl font-semibold text-ink">
              {m.yes_count} <span className="text-ink-light text-xl">/ {m.threshold}</span>
            </div>
          </div>
          {m.maybe_count > 0 && (
            <div className="text-[11px] text-ink-light italic">
              +{m.maybe_count} maybe
            </div>
          )}
        </div>

        {below && !myCommit && (
          <div className="mt-4 bg-amber/10 border-l-4 border-amber rounded-r-lg p-3 text-[11px] leading-relaxed text-ink-soft">
            <div className="font-mono font-bold text-amber text-[10px] tracking-widest mb-1">
              HEADS UP
            </div>
            Only {m.yes_count} committed — we need {m.threshold - m.yes_count} more
            {m.has_dedication ? ` for this dedicated minyan` : ''}.
          </div>
        )}

        <CommitActions
          minyanId={m.id}
          currentStatus={myCommit?.status as any}
          currentNeedsRide={myCommit?.needs_ride || false}
          isBelow={below}
          hasDedication={m.has_dedication}
          sponsorUrl={m.has_dedication ? `/sponsor?minyan=${m.id}` : '/sponsor'}
        />
      </div>
    </div>
  );
}
