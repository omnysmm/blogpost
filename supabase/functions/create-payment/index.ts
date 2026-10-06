// create-payment Edge Function
// YooKassa (Яндекс.Оплата): creates a payment and returns confirmation_url.
//
// Env: YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function env(name: string): string {
  return Deno.env.get(name) || '';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function basicAuth(): string {
  const id = env('YOOKASSA_SHOP_ID');
  const secret = env('YOOKASSA_SECRET_KEY');
  return 'Basic ' + btoa(`${id}:${secret}`);
}

const PLAN_PERIOD: Record<string, string> = {
  basic: 'month',
  pro: 'month',
  premium: 'month',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const body = await req.json();
    const userId = String(body.userId || '');
    const amountValue = body.amount?.value;
    const currency = body.amount?.currency || 'RUB';
    const description = String(body.description || 'Оплата BlogPost');
    const metadata = body.metadata || {};
    const planId = metadata.planId ? String(metadata.planId) : '';

    if (!userId || !amountValue) {
      return json({ error: 'userId and amount.value are required' }, 400);
    }

    const shopId = env('YOOKASSA_SHOP_ID');
    const secret = env('YOOKASSA_SECRET_KEY');
    if (!shopId || !secret) {
      return json({ error: 'YooKassa is not configured (YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY)' }, 503);
    }

    const idempotenceKey = crypto.randomUUID();
    const customerEmail = String(metadata.email || `user-${userId}@blogpost.ru`);
    const receipt = {
      customer: { email: customerEmail },
      items: [
        {
          description: description.slice(0, 128),
          quantity: '1.00',
          amount: { value: String(amountValue), currency },
          vat_code: 1,
          payment_subject: 'service',
          payment_mode: 'full_payment',
        },
      ],
    };

    const paymentRes = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
        Authorization: basicAuth(),
      },
      body: JSON.stringify({
        amount: { value: String(amountValue), currency },
        capture: true,
        description,
        confirmation: {
          type: 'redirect',
          return_url: body.returnUrl || `${env('APP_URL') || 'https://blogpost-omnysmm.vercel.app'}/#/subscriptions?payment=success`,
        },
        metadata: {
          userId,
          planId: planId || undefined,
          blockIds: metadata.blockIds ? JSON.stringify(metadata.blockIds) : undefined,
          kind: planId ? 'subscription' : 'blocks',
        },
        receipt,
      }),
    });

    const payment = await paymentRes.json();
    if (!paymentRes.ok) {
      console.error('YooKassa error:', payment);
      return json({ error: payment?.description || 'YooKassa payment failed' }, paymentRes.status);
    }

    // Store pending payment
    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await db.from('payments').insert({
      user_id: userId,
      amount: Number(amountValue),
      currency,
      description,
      status: 'pending',
      yookassa_id: payment.id,
    });

    return json({
      id: payment.id,
      confirmation_url: payment.confirmation?.confirmation_url,
      status: payment.status,
    });
  } catch (e) {
    console.error('create-payment error:', e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
