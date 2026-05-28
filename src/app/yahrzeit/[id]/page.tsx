import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function YahrzeitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');

  const sb = await supabaseServer();
  const { data: yahrzeit } = await sb
    .from('yahrzeits')
    .select('*')
    .eq('id', id)
    .eq('family_member_id', member.id)
    .maybeSingle();

  if (!yahrzeit) notFound();

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href="/home" className="text-sm text-muted">‹ Home</Link>
      </div>

      <div className="px-5 pt-6 flex-1 flex flex-col min-h-[80vh]">
        <div
          className="text-6xl text-center mb-4"
          style={{ filter: 'drop-shadow(0 0 30px rgba(217,193,148,0.5))' }}
        >
          🕯️
        </div>

        <h1 className="font-serif text-[22px] text-ink text-center leading-tight mb-1">
          {yahrzeit.relationship
            ? `Your ${yahrzeit.relationship}'s yahrzeit is approaching`
            : 'A yahrzeit is approaching'}
        </h1>
        <div className="font-serif text-base italic text-gold-deep text-center mb-6">
          {yahrzeit.deceased_name} · {yahrzeit.hebrew_date}
        </div>

        <div className="bg-cream-warm border border-gold rounded-lg p-4 mb-4">
          <div className="font-mono text-[9px] tracking-[0.2em] text-gold-deep font-bold mb-1.5">
            HONOR THEIR MEMORY WITH THE MINYAN
          </div>
          <div className="text-[13px] text-ink leading-relaxed">
            Sponsor the minyan for that day. Your dedication will be visible to the kehilla,
            and extra care will be taken to ensure the minyan is full.
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-4">
          {[
            { cents: 3600, amt: '$36', name: 'Chai x 2' },
            { cents: 10000, amt: '$100', name: 'Full minyan', primary: true },
            { cents: 18000, amt: '$180', name: 'Chai x 10' }
          ].map(t => (
            <Link
              key={t.cents}
              href={`/sponsor?amount=${t.cents}&yahrzeit=${id}`}
              className={`rounded-lg py-3 text-center border ${
                t.primary
                  ? 'bg-ink text-cream border-ink'
                  : 'bg-parchment border-black/10 text-ink'
              }`}
            >
              <div className="font-serif text-lg font-semibold">{t.amt}</div>
              <div className="text-[9px] mt-1 opacity-70">{t.name}</div>
            </Link>
          ))}
        </div>

        <div className="mt-auto space-y-2">
          <Link href={`/sponsor?yahrzeit=${id}`} className="btn-primary block text-center">
            Sponsor this yahrzeit
          </Link>
          <Link href="/home" className="block text-center text-xs text-muted underline py-2">
            Remind me closer to the date
          </Link>
        </div>
      </div>
    </div>
  );
}
