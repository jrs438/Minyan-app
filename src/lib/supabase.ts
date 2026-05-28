import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(URL, ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as CookieOptions)
          );
        } catch {
          // Called from a Server Component — safe to ignore
        }
      }
    }
  });
}

// Service-role client for admin ops (webhooks, cron jobs). Never expose to browser.
export function supabaseAdmin() {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function getCurrentMember() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: member } = await sb
    .from('members')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();
  return member;
}
