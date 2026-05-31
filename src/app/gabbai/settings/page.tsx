import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember, supabaseServer } from '@/lib/supabase';
import { SettingsForm } from '@/components/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function GabbaiSettingsPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  if (member.role !== 'gabbai' && member.role !== 'admin') redirect('/home');

  const sb = await supabaseServer();
  const { data: settings } = await sb.from('app_settings').select('*').eq('id', 1).maybeSingle();

  return (
    <div className="min-h-screen bg-parchment pb-20 pt-safe">
      <div className="px-5 pt-4">
        <Link href="/gabbai" className="text-sm text-muted">‹ Gabbai</Link>
        <h1 className="font-serif text-2xl text-ink mt-2">Settings</h1>
        <p className="text-[12px] text-muted italic mt-1">
          Configure links and integrations that appear elsewhere in the app.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
