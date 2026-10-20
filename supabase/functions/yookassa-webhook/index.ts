// yookassa-webhook Edge Function
// Receives YooKassa payment.succeeded / payment.canceled / refund.succeeded
// and updates payments + profile subscription.
//
// URL to register in YooKassa: https://<project>.supabase.co/functions/v1/yookassa-webhook
// Env: YOOKASSA_WEBHOOK_SECRET (optional header check), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function env(name: string): string {
  return Deno.env.get(name) || '';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function admin() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function activateSubscription(userId: string, planId: string) {
  const db = admin();
  const trialEnd = new Date();
  trialEnd.setMonth(trialEnd.getMonth() + 1);

  await db
    .from('profiles')
    .update({
      subscription: planId,
      free_trial_end: trialEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    // Optional shared-secret check
    const secret = env('YOOKASSA_WEBHOOK_SECRET');
    if (secret) {
      const header = req.headers.get('Authorization') || req.headers.get('X-Webhook-Secret') || '';
      if (!header.includes(secret)) {
        return json({ error: 'unauthorized' }, 401);
      }
    }

    const event = await req.json();
    const type = String(event?.event || event?.type || '');
    const object = event?.object || event?.data?.object || {};
    const paymentId = object?.id;
    const metadata = object?.metadata || {};
    const userId = metadata.userId;
    const planId = metadata.planId;

    const db = admin();

    if (type === 'payment.succeeded') {
      await db
        .from('payments')
        .update({ status: 'succeeded' })
        .eq('yookassa_id', paymentId);

      if (userId && planId) {
        await activateSubscription(userId, planId);
      }

      // Purchased constructor blocks
      if (userId && metadata.blockIds) {
        try {
          const blockIds = JSON.parse(String(metadata.blockIds)) as string[];
          for (const blockType of blockIds) {
            await db.from('user_blocks').upsert(
              {
                user_id: userId,
                block_type: blockType,
                active: true,
                purchased_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,block_type' }
            );
          }
        } catch (e) {
          console.error('blockIds parse failed', e);
        }
      }

      return json({ ok: true, status: 'succeeded' });
    }

    if (type === 'payment.canceled' || type === 'payment.refunded') {
      await db
        .from('payments')
        .update({ status: type === 'payment.refunded' ? 'refunded' : 'canceled' })
        .eq('yookassa_id', paymentId);
      return json({ ok: true, status: type });
    }

    if (type === 'refund.succeeded') {
      await db
        .from('payments')
        .update({ status: 'refunded' })
        .eq('yookassa_id', object?.payment_id || paymentId);
      return json({ ok: true, status: 'refunded' });
    }

    return json({ ok: true, ignored: type });
  } catch (e) {
    console.error('yookassa-webhook error:', e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
