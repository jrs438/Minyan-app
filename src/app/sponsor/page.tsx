import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { SponsorForm } from '@/components/SponsorForm';

export const dynamic = 'force-dynamic';

export default async function SponsorPage({
  searchParams
}: {
  searchParams: Promise<{ minyan?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');

  const { minyan: minyanId } = await searchParams;
  const sb = await supabaseServer();

  const { data: pool } = await sb.from('pool_state').select('*').eq('id', 1).single();
  const poolDollars = pool ? (pool.balance_cents / 100).toLocaleString() : '0';
  const sponsorCount = pool?.total_sponsors || 0;

  // Load upcoming minyanim (for "dedicate to a specific date")
  const { data: upcoming } = await sb
    .from('minyanim')
    .select('id, service_date, minyan_type, display_time, start_time')
    .gte('service_date', new Date().toISOString().slice(0, 10))
    .order('start_time')
    .limit(14);

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href="/home" className="text-sm text-muted">‹ Home</Link>
      </div>

      <div className="px-5 pt-4">
        <div
          className="relative overflow-hidden rounded-2xl p-5 text-cream text-center mb-5"
          style={{ background: 'linear-gradient(135deg, #0f1e2e 0%, #1a2c42 100%)' }}
        >
          <div
            className="absolute text-[100px] opacity-[0.04] -top-5 -right-3 text-gold-soft pointer-events-none"
            style={{ lineHeight: 1 }}
          >
            ✡
          </div>
          <h1 className="font-serif italic text-[22px] font-medium mb-1.5">
            Support the Minyan
          </h1>
          <p className="text-[11px] leading-relaxed text-cream/70 mb-3.5">
            Your contribution funds the rewards that bring our young men to daily minyan —
            and honors whoever you choose.
          </p>
          <div className="bg-gold-soft/10 border border-gold-soft/20 rounded-lg py-2 text-[12px] text-gold-soft font-mono">
            POOL · ${poolDollars} · {sponsorCount} sponsor{sponsorCount === 1 ? '' : 's'}
          </div>
        </div>

        <SponsorForm
          memberId={member.id}
          memberName={`${member.first_name} ${member.last_name}`}
          upcomingMinyanim={upcoming || []}
          preselectMinyanId={minyanId}
        />
      </div>
    </div>
  );
}
