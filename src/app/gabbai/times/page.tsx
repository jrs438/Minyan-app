import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { TimesEditor } from '@/components/TimesEditor';
import { RefreshScheduleButton } from '@/components/RefreshScheduleButton';

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
          Times sync nightly from Hebcal. Tap below to load them now, or override a time for a special day.
        </p>
        <RefreshScheduleButton />
        {(!minyanim || minyanim.length === 0) && (
          <p className="text-[13px] text-muted mb-4">
            No upcoming services yet — tap “Refresh schedule from Hebcal” to load the next two weeks.
          </p>
        )}
      </div>
      <TimesEditor minyanim={minyanim || []} />
    </div>
  );
}
