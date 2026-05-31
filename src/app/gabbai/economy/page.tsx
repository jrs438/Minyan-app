import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function IncentivesPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  if (member.role !== 'gabbai' && member.role !== 'admin') redirect('/home');

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href="/gabbai" className="text-sm text-muted">‹ Gabbai</Link>
        <h1 className="font-serif text-2xl text-ink mt-2">Incentives</h1>
        <p className="text-[12px] text-muted italic mt-1 mb-4">
          The current rules of the points system.
        </p>
      </div>
      <div className="px-5 space-y-4">
        <Section title="Earning — teens & preteens">
          <Row label="Attendance" value="1 pt" />
          <Row label="Sponsored / yahrzeit minyan" value="3 pts" />
          <Row label="Committed yes 12+ hrs ahead and showed" value="+0.5 pt" />
          <Row label="Bonus once streak passes 3 days" value="+1 pt / attendance" />
          <Row label="Gabbai manual award" value="any amount" />
          <p className="text-[11px] text-muted mt-2 italic">
            Preteens earn points like teens but don't count toward the minyan-of-10 threshold.
          </p>
        </Section>

        <Section title="Adults">
          <p className="text-[12px] text-ink-light">
            Recognition only — no points. The "15+ this month" honor board still applies.
          </p>
        </Section>

        <Section title="Spending">
          <Row label="🎁 Store" value="redeem points for gabbai-stocked items" />
          <Row label="🎟 Raffle" value="1 pt earned this period = 1 entry" />
          <p className="text-[11px] text-muted mt-2 italic">
            Store redemptions deduct points. Raffle entries reset each raffle (counted live from earnings in the window), so the store and raffle don't compete for the same balance.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-cream-warm border border-black/10 rounded-xl p-4">
      <div className="font-serif text-[15px] font-semibold text-ink mb-2">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-black/5 last:border-b-0 gap-3">
      <div className="text-[13px] text-ink">{label}</div>
      <div className="text-[11px] font-mono text-gold-deep text-right whitespace-nowrap">{value}</div>
    </div>
  );
}
