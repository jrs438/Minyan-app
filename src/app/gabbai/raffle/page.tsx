import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { RaffleManager } from '@/components/RaffleManager';

export const dynamic = 'force-dynamic';

export default async function GabbaiRafflePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  if (member.role !== 'gabbai' && member.role !== 'admin') redirect('/home');

  const sb = await supabaseServer();
  const { data: raffles } = await sb.from('raffles')
    .select('*, winner:winner_member_id(first_name, last_name)')
    .order('period_end', { ascending: false });

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href="/gabbai" className="text-sm text-muted">‹ Gabbai</Link>
        <h1 className="font-serif text-2xl text-ink mt-2">Raffle</h1>
        <p className="text-[12px] text-muted italic mt-1">
          Every point a teen earns during the raffle window counts as one entry. Draw a winner after the end date.
        </p>
      </div>
      <RaffleManager raffles={raffles || []} />
    </div>
  );
}
