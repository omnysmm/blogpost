// schedule-publish Edge Function
// Stores scheduled publication metadata on the post row.
// Actual publishing is done client-side (processDuePosts) or by a future cron.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const body = await req.json();
    const { userId, postId, scheduledAt, scheduledDates, scheduledTime, networks } = body;

    if (!userId || !postId) {
      return json({ error: 'userId and postId are required' }, 400);
    }

    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const updates: Record<string, unknown> = {
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    };
    if (scheduledAt) updates.scheduled_at = scheduledAt;
    if (Array.isArray(networks) && networks.length) updates.social_networks = networks;

    const { data, error } = await db
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Optional: store calendar slots if the table/columns exist (best-effort)
    if (Array.isArray(scheduledDates) && scheduledDates.length) {
      // Keep in post meta via scheduled_at + client-side scheduledDates in localStorage
      console.log('scheduledDates', scheduledDates, 'time', scheduledTime);
    }

    return json({ success: true, post: data });
  } catch (e) {
    console.error('schedule-publish error:', e);
    return json({ success: false, error: String(e?.message || e) }, 500);
  }
});
