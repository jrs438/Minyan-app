import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { BottomTabBar } from '@/components/BottomTabBar';
import { MultiCommit } from '@/components/MultiCommit';
import type { UpcomingMinyan } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CommitMultiPage({
  searchParams
}: {
  searchParams: Promise<{ member?: string }>
}) {
  const me = await getCurrentMember();
  if (!me) redirect('/auth/login');

  const sp = await searchParams;
  const isAdminForOther = !!sp.member && (me.role === 'gabbai' || me.role === 'admin');
  const targetMemberId = isAdminForOther ? sp.member! : me.id;

  const sb = await supabaseServer();
  const { data: minyanim } = await sb.from('v_upcoming_minyanim').select('*')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(10);

  const { data: commits } = await sb.from('commitments')
    .select('minyan_id, status, needs_ride')
    .eq('member_id', targetMemberId);

  let targetName = 'You';
  if (isAdminForOther) {
    const { data: tm } = await sb.from('members').select('first_name, last_name')
      .eq('id', targetMemberId).maybeSingle();
    if (tm) targetName = `${tm.first_name} ${tm.last_name}`;
  }

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href={isAdminForOther ? '/gabbai' : '/home'} className="text-sm text-muted">
          ‹ {isAdminForOther ? 'Gabbai' : 'Home'}
        </Link>
        <h1 className="font-serif text-2xl text-ink mt-2">
          {isAdminForOther ? `RSVP for ${targetName}` : 'RSVP for the week'}
        </h1>
        <p className="text-[12px] text-muted italic mt-1">
          Set or change RSVPs for any upcoming minyan in one place.
        </p>
      </div>
      <MultiCommit
        minyanim={(minyanim || []) as UpcomingMinyan[]}
        myCommits={(commits || []) as any}
        memberId={targetMemberId}
      />
      <BottomTabBar active="home" role={me.role} />
    </div>
  );
}
