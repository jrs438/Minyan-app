'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

function CallbackInner() {
  const router = useRouter();
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage('That sign-in link expired or was invalid. Open the app and request a fresh one.');
          setTimeout(() => router.push('/auth/login'), 2000);
          return;
        }
      } else {
        // Fall back to whatever the client picked up from the URL fragment
        // (implicit-flow links). If there's still no session, bounce home.
        const { data: { session } } = await sb.auth.getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }
      }

      const res = await fetch('/api/auth/link', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        await sb.auth.signOut();
        const reason =
          data.reason === 'inactive' ? 'Your membership is inactive — text the gabbai.'
          : data.reason === 'not_registered' ? "This email isn't registered — text the gabbai to be added."
          : 'Could not sign you in. Please try again.';
        setMessage(reason);
        setTimeout(() => router.push('/auth/login'), 2500);
        return;
      }

      router.push('/home');
      router.refresh();
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div className="text-[13px] text-muted">{message}</div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">Signing you in…</div>}>
      <CallbackInner />
    </Suspense>
  );
}
