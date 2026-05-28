import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: member } = await sb.from('members').select('*').eq('auth_user_id', user.id).single();
  if (!member) return NextResponse.json({ error: 'no member' }, { status: 403 });

  const body = await req.json();
  const amountCents: number = body.amount_cents;
  const contribType: 'dedication' | 'pool' = body.contribution_type;
  const dedi = body.dedication;

  if (!amountCents || amountCents < 500) {
    return NextResponse.json({ error: 'Amount too small' }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });
  const admin = supabaseAdmin();

  // Create dedication first if applicable, so webhook can attach sponsorship
  let dedicationId: string | null = null;
  if (contribType === 'dedication' && dedi) {
    const { data: ded, error: dedErr } = await admin.from('dedications').insert({
      minyan_id: dedi.minyan_id,
      sponsor_member_id: member.id,
      dedication_type: dedi.dedication_type,
      dedication_text: dedi.dedication_text,
      sponsor_display_name: dedi.sponsor_display_name,
      is_yahrzeit: dedi.is_yahrzeit || false
    }).select('id').single();
    if (dedErr) return NextResponse.json({ error: dedErr.message }, { status: 500 });
    dedicationId = ded.id;
  }

  // Create pending sponsorship record
  const { data: sp, error: spErr } = await admin.from('sponsorships').insert({
    sponsor_member_id: member.id,
    amount_cents: amountCents,
    status: 'pending',
    contribution_type: contribType === 'dedication'
      ? (dedi?.is_yahrzeit ? 'yahrzeit' : 'dedication')
      : 'pool',
    dedication_id: dedicationId
  }).select('id').single();
  if (spErr) return NextResponse.json({ error: spErr.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: contribType === 'dedication'
            ? `Minyan Dedication · ${dedi.dedication_text}`
            : 'Minyan Pool Contribution'
        },
        unit_amount: amountCents
      },
      quantity: 1
    }],
    customer_email: member.email || undefined,
    success_url: `${appUrl}/sponsor/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/sponsor?cancelled=true`,
    metadata: {
      sponsorship_id: sp.id,
      member_id: member.id,
      dedication_id: dedicationId || ''
    }
  });

  // Record session id
  await admin.from('sponsorships')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', sp.id);

  return NextResponse.json({ url: session.url });
}
