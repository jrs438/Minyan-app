import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function ThanksPage({
  searchParams
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  let amount: number | null = null;
  let dedicationText: string | null = null;

  if (session_id) {
    const admin = supabaseAdmin();
    const { data: sp } = await admin
      .from('sponsorships')
      .select('amount_cents, dedication_id')
      .eq('stripe_checkout_session_id', session_id)
      .maybeSingle();
    if (sp) {
      amount = sp.amount_cents;
      if (sp.dedication_id) {
        const { data: ded } = await admin.from('dedications').select('dedication_text').eq('id', sp.dedication_id).single();
        dedicationText = ded?.dedication_text || null;
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-gradient-to-b from-parchment to-cream-warm pt-safe pb-safe">
      <div className="text-6xl mb-6">✡</div>
      <h1 className="font-serif text-3xl text-ink mb-3 italic">Thank you</h1>
      {amount && (
        <p className="text-base text-ink-light mb-2">
          ${(amount / 100).toFixed(2)} received
        </p>
      )}
      {dedicationText && (
        <p className="font-serif italic text-ink-soft max-w-sm mb-6">
          Your dedication for <strong>{dedicationText}</strong> will appear at the minyan.
        </p>
      )}
      <p className="text-sm text-muted mb-8">Receipt sent to your email.</p>
      <Link href="/home" className="btn-primary inline-block max-w-xs">
        Back to home
      </Link>
    </div>
  );
}
