import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-side Supabase client. Kept separate from src/lib/supabase.ts so that
// client components don't pull in next/headers (which is server-only).
export function supabaseBrowser() {
  return createBrowserClient(URL, ANON_KEY);
}
