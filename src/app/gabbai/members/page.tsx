import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { MemberManager } from '@/components/MemberManager';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  if (member.role !== 'gabbai' && member.role !== 'admin') redirect('/home');

  const sb = await supabaseServer();
  const { data: members } = await sb.from('members').select('*').order('last_name');

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href="/gabbai" className="text-sm text-muted">‹ Gabbai</Link>
        <h1 className="font-serif text-2xl text-ink mt-2">Members</h1>
      </div>

      <MemberManager members={members || []} />
    </div>
  );
}
