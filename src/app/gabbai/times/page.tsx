import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { TimesEditor } from '@/components/TimesEditor';

export const dynamic = 'force-dynamic';

export default async function TimesPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  if (member.role !== 'gabbai' && member.role !== 'admin') redirect('/home');

  const sb = await supabaseServer();
  const { data: minyanim } = await sb
    .from('minyanim')
    .select('*')
    .gte('service_date', new Date().toISOString().slice(0, 10))
    .order('start_time')
    .limit(20);

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href="/gabbai" className="text-sm text-muted">‹ Gabbai</Link>
        <h1 className="font-serif text-2xl text-ink mt-2">Edit Times</h1>
        <p className="text-[12px] text-muted italic mt-1 mb-4">
          Times sync nightly from Hebcal. Override here for special days.
        </p>
      </div>
      <TimesEditor minyanim={minyanim || []} />
    </div>
  );
}
