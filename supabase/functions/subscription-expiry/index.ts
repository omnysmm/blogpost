// Supabase Edge Function: subscription-expiry
// Downgrades subscriptions whose trial/paid period is over.
// Callable by external cron (UptimeRobot, GitHub Actions) as a fallback when
// pg_cron is not enabled. Also callable manually to force a sweep.
//
// URL: https://<project>.supabase.co/functions/v1/subscription-expiry
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (optional)

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

Deno.serve(async (req: Request) => {
  // Shared-secret check for cron callers (GET with ?key= or Authorization header)
  const secret = env('CRON_SECRET');
  if (secret) {
    const url = new URL(req.url);
    const header = req.headers.get('Authorization') || '';
    const key = url.searchParams.get('key') || '';
    if (!header.includes(secret) && key !== secret) {
      return json({ error: 'unauthorized' }, 401);
    }
  }

  try {
    const db = admin();
    const now = new Date().toISOString();

    const { data, error } = await db
      .from('profiles')
      .update({ subscription: 'free', updated_at: now })
      .neq('subscription', 'free')
      .not('free_trial_end', 'is', null)
      .lt('free_trial_end', now)
      .select('id');

    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, expired: data?.length ?? 0, at: now });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
