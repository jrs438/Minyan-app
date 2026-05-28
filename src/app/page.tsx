import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/supabase';

export default async function RootPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  redirect('/home');
}
