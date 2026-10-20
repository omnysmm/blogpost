// social-oauth Edge Function
// Connects a social network account for *publishing* (not login).
// Supports: vk, ok (OAuth code flow). Telegram uses bot token in Settings (no OAuth).
//
// Flow:
//   GET ?network=vk|ok&redirect=...&user_id=...  → redirect to provider
//   Provider callback ?code=... → exchange token, save to social_accounts, back to app
//
// Env: VK_PUBLISH_CLIENT_ID/SECRET, OK_PUBLISH_CLIENT_ID/SECRET/KEY/SECRET_KEY,
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Network = 'vk' | 'ok' | 'telegram' | 'youtube' | 'instagram' | 'tiktok' | 'rutube';

function env(name: string): string {
  return Deno.env.get(name) || '';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function redirect(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url, ...corsHeaders } });
}

function admin() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Scopes for publishing
function authorizeUrl(network: Network, redirectUri: string, state: string): string {
  switch (network) {
    case 'vk':
      return (
        `https://oauth.vk.com/authorize?client_id=${env('VK_PUBLISH_CLIENT_ID') || env('VK_CLIENT_ID')}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code&scope=wall,photos,groups,offline&v=5.131&state=${state}`
      );
    case 'ok':
      return (
        `https://oauth.ok.ru/authorize?client_type=app&response_type=code` +
        `&client_id=${env('OK_PUBLISH_CLIENT_ID') || env('OK_CLIENT_ID')}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=VALUABLE_ACCESS,PHOTO_CONTENT,PUBLISH_TO_FEED&state=${state}`
      );
    default:
      throw new Error(`Network ${network} OAuth not supported yet — use API key in Settings`);
  }
}

async function exchangeAndSave(
  network: Network,
  code: string,
  redirectUri: string,
  userId: string
): Promise<{ accountName: string }> {
  const db = admin();

  if (network === 'vk') {
    const clientId = env('VK_PUBLISH_CLIENT_ID') || env('VK_CLIENT_ID');
    const clientSecret = env('VK_PUBLISH_CLIENT_SECRET') || env('VK_CLIENT_SECRET');
    const tokenRes = await fetch(
      `https://oauth.vk.com/access_token?client_id=${clientId}&client_secret=${clientSecret}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    );
    const token = await tokenRes.json();
    if (!token.access_token) throw new Error(`VK token error: ${JSON.stringify(token)}`);

    const userRes = await fetch(
      `https://api.vk.com/method/users.get?access_token=${token.access_token}&v=5.131`
    );
    const userData = await userRes.json();
    const u = userData.response?.[0];
    const accountName = u ? `${u.first_name} ${u.last_name}`.trim() : `VK ${token.user_id}`;

    await db.from('social_accounts').upsert(
      {
        user_id: userId,
        network: 'vk',
        account_name: accountName,
        account_id: String(token.user_id),
        access_token: token.access_token,
        expires_at: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000).toISOString()
          : null,
        connected: true,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,network' }
    );
    return { accountName };
  }

  if (network === 'ok') {
    const clientId = env('OK_PUBLISH_CLIENT_ID') || env('OK_CLIENT_ID');
    const clientSecret = env('OK_PUBLISH_CLIENT_SECRET') || env('OK_CLIENT_SECRET');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });
    const tokenRes = await fetch('https://api.ok.ru/oauth/token.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const token = await tokenRes.json();
    if (!token.access_token) throw new Error(`OK token error: ${JSON.stringify(token)}`);

    const infoRes = await fetch(
      `https://api.ok.ru/fb.do?method=users.getCurrentUser&access_token=${token.access_token}` +
        `&application_key=${env('OK_PUBLIC_KEY')}&format=json`
    );
    const info = await infoRes.json();
    const accountName = info.name || `OK ${info.uid}`;

    await db.from('social_accounts').upsert(
      {
        user_id: userId,
        network: 'ok',
        account_name: accountName,
        account_id: String(info.uid || ''),
        access_token: token.access_token,
        refresh_token: token.refresh_token || null,
        connected: true,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,network' }
    );
    return { accountName };
  }

  throw new Error(`Unsupported network: ${network}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const network = url.searchParams.get('network') as Network | null;
    const code = url.searchParams.get('code');
    const appRedirect = url.searchParams.get('redirect') || '/';
    const userId = url.searchParams.get('user_id') || '';

    if (!network || !['vk', 'ok'].includes(network)) {
      return json(
        { error: 'network must be vk | ok (telegram — API key in Settings)' },
        400
      );
    }

    const fnBase = `${env('SUPABASE_URL')}/functions/v1/social-oauth`;
    const redirectUri = `${fnBase}?network=${network}&redirect=${encodeURIComponent(appRedirect)}&user_id=${encodeURIComponent(userId)}`;

    if (!code) {
      const state = crypto.randomUUID();
      return redirect(authorizeUrl(network, redirectUri, state));
    }

    if (!userId) {
      return json({ error: 'user_id is required' }, 400);
    }

    const { accountName } = await exchangeAndSave(network, code, redirectUri, userId);

    const target = new URL(appRedirect, url.origin);
    const hashPart = target.hash.replace(/^#\/?/, '');
    const [hashPath, existingQuery] = hashPart.split('?');
    const params = new URLSearchParams(existingQuery || '');
    params.set('connected', network);
    params.set('account', accountName);
    return redirect(`${target.origin}${target.pathname}${target.search}#/${hashPath || 'settings'}?${params}`);
  } catch (e) {
    console.error('social-oauth error:', e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
