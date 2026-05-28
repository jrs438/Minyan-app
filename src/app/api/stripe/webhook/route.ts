import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';

// Stripe requires the raw request body for signature verification.
// In the App Router, `await req.text()` already returns the unparsed body,
// so no bodyParser config is needed — we just force this route to stay dynamic.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'no signature' }, { status: 400 });

  let event: Stripe.Event;
  const body = await req.text();
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const admin = supabaseAdmin();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const sponsorshipId = session.metadata?.sponsorship_id;
    if (!sponsorshipId) {
      return NextResponse.json({ ok: true, ignored: 'no sponsorship_id' });
    }

    // Mark paid
    await admin.from('sponsorships').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: session.payment_intent as string
    }).eq('id', sponsorshipId);

    // Update pool state
    const { data: sp } = await admin.from('sponsorships').select('amount_cents').eq('id', sponsorshipId).single();
    if (sp) {
      const { data: cur } = await admin.from('pool_state').select('*').eq('id', 1).single();
      if (cur) {
        await admin.from('pool_state').update({
          balance_cents: cur.balance_cents + sp.amount_cents,
          total_sponsors: cur.total_sponsors + 1,
          total_contributed_cents: cur.total_contributed_cents + sp.amount_cents,
          updated_at: new Date().toISOString()
        }).eq('id', 1);
      }
    }
  }

  if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
    const obj = event.data.object as any;
    const sponsorshipId = obj.metadata?.sponsorship_id;
    if (sponsorshipId) {
      await admin.from('sponsorships').update({ status: 'failed' }).eq('id', sponsorshipId);
    }
  }

  return NextResponse.json({ received: true });
}
