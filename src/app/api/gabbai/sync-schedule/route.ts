import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { syncSchedule } from '@/lib/zmanim';

// Lets a logged-in gabbai/admin populate or refresh the schedule on demand,
// without needing the cron secret.
export async function POST() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await sb.from('members').select('role').eq('auth_user_id', user.id).maybeSingle();
  if (!me || (me.role !== 'gabbai' && me.role !== 'admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const results = await syncSchedule();
  return NextResponse.json({ ok: true, scheduled: results.length });
}
