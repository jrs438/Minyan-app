import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { AwardForm } from '@/components/AwardForm';
import type { Member } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function GabbaiAwardPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  if (member.role !== 'gabbai' && member.role !== 'admin') redirect('/home');

  const sb = await supabaseServer();
  const { data: members } = await sb.from('members')
    .select('*').eq('active', true).order('first_name');

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href="/gabbai" className="text-sm text-muted">‹ Gabbai</Link>
        <h1 className="font-serif text-2xl text-ink mt-2">Award Points</h1>
        <p className="text-[12px] text-muted italic mt-1">
          Give a member points for leading davening, a D'var Torah, or anything else worth recognizing.
        </p>
      </div>
      <AwardForm members={(members || []) as Member[]} />
    </div>
  );
}
