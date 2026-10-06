// refund-payment Edge Function
// Creates a YooKassa refund for a captured payment.
//
// Env: YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

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
  return 'Basic ' + btoa(`${env('YOOKASSA_SHOP_ID')}:${env('YOOKASSA_SECRET_KEY')}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const body = await req.json();
    const paymentId = String(body.paymentId || body.yookassaId || '');
    const reason = String(body.reason || 'Refund requested by user');

    if (!paymentId) return json({ error: 'paymentId is required' }, 400);

    const shopId = env('YOOKASSA_SHOP_ID');
    const secret = env('YOOKASSA_SECRET_KEY');
    if (!shopId || !secret) {
      return json({ error: 'YooKassa is not configured' }, 503);
    }

    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Load local payment row to get amount / real YooKassa payment id
    const { data: rows } = await db
      .from('payments')
      .select('*')
      .or(`id.eq.${paymentId},yookassa_id.eq.${paymentId}`)
      .limit(1);

    const row = rows?.[0];
    const yookassaId = row?.yookassa_id || paymentId;
    const amount = row?.amount ? String(Number(row.amount).toFixed(2)) : body.amount;

    if (!amount) return json({ error: 'amount is required (payment row not found)' }, 400);

    const refundRes = await fetch('https://api.yookassa.ru/v3/refunds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': crypto.randomUUID(),
        Authorization: basicAuth(),
      },
      body: JSON.stringify({
        payment_id: yookassaId,
        amount: { value: String(amount), currency: row?.currency || 'RUB' },
        description: reason.slice(0, 128),
      }),
    });

    const refund = await refundRes.json();
    if (!refundRes.ok) {
      return json({ error: refund?.description || 'Refund failed' }, refundRes.status);
    }

    if (row?.id) {
      await db.from('payments').update({ status: 'refunded' }).eq('id', row.id);
    }

    return json({ success: true, refund });
  } catch (e) {
    console.error('refund-payment error:', e);
    return json({ success: false, error: String(e?.message || e) }, 500);
  }
});
