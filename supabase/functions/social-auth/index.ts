// social-auth Edge Function
// Custom OAuth for VK, Yandex, OK (no Google — product requirement).
// Flow:
//   1. GET ?provider=vk|yandex|ok&redirect=...  → 302 to provider consent
//   2. Provider redirects back with ?code=...  → exchange code, find/create user,
//      issue Supabase magic-link OTP, redirect to app with email+token
//
// Env (Edge Function secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
//   VK_CLIENT_ID, VK_CLIENT_SECRET
//   YANDEX_CLIENT_ID, YANDEX_CLIENT_SECRET
//   OK_CLIENT_ID, OK_CLIENT_SECRET, OK_PUBLIC_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Provider = 'vk' | 'yandex' | 'ok';

interface OAuthProfile {
  email: string;
  name: string;
  provider: Provider;
  providerUserId: string;
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

function env(name: string): string {
  return Deno.env.get(name) || '';
}

// ═══ Provider OAuth details ═══

function authorizeUrl(provider: Provider, redirectUri: string): string {
  const state = crypto.randomUUID();
  switch (provider) {
    case 'vk':
      return (
        `https://oauth.vk.com/authorize?client_id=${env('VK_CLIENT_ID')}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code&scope=email&v=5.131&state=${state}`
      );
    case 'yandex':
      return (
        `https://oauth.yandex.ru/authorize?response_type=code` +
        `&client_id=${env('YANDEX_CLIENT_ID')}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}`
      );
    case 'ok':
      return (
        `https://oauth.ok.ru/authorize?client_type=app&response_type=code` +
        `&client_id=${env('OK_CLIENT_ID')}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=LONG_ACCESS_TOKEN,GET_EMAIL&state=${state}`
      );
  }
}

async function exchangeCode(provider: Provider, code: string, redirectUri: string): Promise<OAuthProfile> {
  switch (provider) {
    case 'vk':
      return exchangeVk(code, redirectUri);
    case 'yandex':
      return exchangeYandex(code, redirectUri);
    case 'ok':
      return exchangeOk(code, redirectUri);
  }
}

async function exchangeVk(code: string, redirectUri: string): Promise<OAuthProfile> {
  const tokenRes = await fetch(
    `https://oauth.vk.com/access_token?client_id=${env('VK_CLIENT_ID')}` +
      `&client_secret=${env('VK_CLIENT_SECRET')}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`,
  );
  const token = await tokenRes.json();
  if (!token.access_token) throw new Error(`VK token error: ${JSON.stringify(token)}`);

  const userRes = await fetch(
    `https://api.vk.com/method/users.get?access_token=${token.access_token}&v=5.131&fields=photo_200`,
  );
  const userData = await userRes.json();
  const u = userData.response?.[0];
  if (!u) throw new Error('VK user fetch failed');

  return {
    // VK returns email in token response when scope=email; fallback to id-based placeholder
    email: token.email || `vk_${token.user_id}@blogpost.users`,
    name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || `VK ${token.user_id}`,
    provider: 'vk',
    providerUserId: String(token.user_id),
  };
}

async function exchangeYandex(code: string, redirectUri: string): Promise<OAuthProfile> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: env('YANDEX_CLIENT_ID'),
    client_secret: env('YANDEX_CLIENT_SECRET'),
    redirect_uri: redirectUri,
  });
  const tokenRes = await fetch('https://oauth.yandex.ru/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const token = await tokenRes.json();
  if (!token.access_token) throw new Error(`Yandex token error: ${JSON.stringify(token)}`);

  const infoRes = await fetch('https://login.yandex.ru/info?format=json', {
    headers: { Authorization: `OAuth ${token.access_token}` },
  });
  const info = await infoRes.json();
  if (!info.id) throw new Error('Yandex user fetch failed');

  return {
    email: info.default_email || `yandex_${info.id}@blogpost.users`,
    name: info.real_name || info.display_name || `Yandex ${info.id}`,
    provider: 'yandex',
    providerUserId: String(info.id),
  };
}

async function exchangeOk(code: string, redirectUri: string): Promise<OAuthProfile> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: env('OK_CLIENT_ID'),
    client_secret: env('OK_CLIENT_SECRET'),
    redirect_uri: redirectUri,
  });
  const tokenRes = await fetch('https://api.ok.ru/oauth/token.do', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const token = await tokenRes.json();
  if (!token.access_token) throw new Error(`OK token error: ${JSON.stringify(token)}`);

  const sigSource = `application_key=${env('OK_PUBLIC_KEY')}method=users.getCurrentUser${token.access_token}`;
  // OK requires Sig = md5( params_sorted + session_secret_key )
  const secret = env('OK_SECRET_KEY') || env('OK_CLIENT_SECRET');
  const sig = md5Hex(sigSource + secret);

  const infoRes = await fetch(
    `https://api.ok.ru/fb.do?method=users.getCurrentUser&access_token=${token.access_token}` +
      `&application_key=${env('OK_PUBLIC_KEY')}&sig=${sig}&format=json`,
  );
  const info = await infoRes.json();
  if (!info.uid) throw new Error(`OK user fetch failed: ${JSON.stringify(info)}`);

  return {
    email: info.email || `ok_${info.uid}@blogpost.users`,
    name: info.name || `OK ${info.uid}`,
    provider: 'ok',
    providerUserId: String(info.uid),
  };
}

/** Compact MD5 (OK API requires Sig = md5(...)). Web Crypto has no MD5. */
function md5Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32);
  const ml = bytes.length * 8;
  const withPad = new Uint8Array(((bytes.length + 8) >> 6 << 6) + 64);
  withPad.set(bytes);
  withPad[bytes.length] = 0x80;
  const dv = new DataView(withPad.buffer);
  dv.setUint32(withPad.length - 8, ml >>> 0, true);
  dv.setUint32(withPad.length - 4, Math.floor(ml / 2 ** 32), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < withPad.length; off += 64) {
    const M = new Uint32Array(16);
    for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint32Array([a0, b0, c0, d0]);
  let hex = '';
  for (const n of out) {
    const le = new Uint32Array([n]);
    const b = new Uint8Array(le.buffer);
    for (const x of b) hex += x.toString(16).padStart(2, '0');
  }
  return hex;
}

// ═══ Supabase user + magic-link session ═══

async function findOrCreateUser(profile: OAuthProfile): Promise<string> {
  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Find existing user by email
  const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let userId = listData?.users?.find((u) => u.email?.toLowerCase() === profile.email.toLowerCase())?.id;

  if (!userId) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: profile.email,
      email_confirm: true,
      user_metadata: {
        name: profile.name,
        social_provider: profile.provider,
        social_id: profile.providerUserId,
      },
    });
    if (error || !created.user) {
      throw new Error(`createUser failed: ${error?.message}`);
    }
    userId = created.user.id;
  } else {
    // Link social identity in metadata (best-effort)
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        name: profile.name,
        social_provider: profile.provider,
        social_id: profile.providerUserId,
      },
    });
  }

  return userId;
}

async function issueMagicLink(email: string): Promise<{ token: string }> {
  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (error || !data) throw new Error(`generateLink failed: ${error?.message}`);
  // email_otp is what verifyOtp accepts
  const token = (data as any).email_otp || (data as any).properties?.email_otp;
  if (!token) throw new Error('No email_otp in generateLink response');
  return { token };
}

// ═══ Handler ═══

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider') as Provider | null;
    const code = url.searchParams.get('code');
    const appRedirect = url.searchParams.get('redirect') || '/';

    if (!provider || !['vk', 'yandex', 'ok'].includes(provider)) {
      return json({ error: 'provider must be vk | yandex | ok' }, 400);
    }

    // Callback URI registered with the OAuth provider
    const fnBase = `${env('SUPABASE_URL')}/functions/v1/social-auth`;
    const redirectUri = `${fnBase}?provider=${provider}&redirect=${encodeURIComponent(appRedirect)}`;

    // Step 1: start OAuth
    if (!code) {
      return redirect(authorizeUrl(provider, redirectUri));
    }

    // Step 2: handle callback
    const profile = await exchangeCode(provider, code, redirectUri);
    await findOrCreateUser(profile);
    const { token } = await issueMagicLink(profile.email);

    const target = new URL(appRedirect, url.origin);
    // SPA hash route: keep path, attach token as query inside the hash
    // e.g. https://app/#/auth?token=...&email=...
    const hashPart = target.hash.replace(/^#\/?/, ''); // 'auth' or 'auth?x=1'
    const [hashPath, existingQuery] = hashPart.split('?');
    const hashParams = new URLSearchParams(existingQuery || '');
    hashParams.set('token', token);
    hashParams.set('email', profile.email);
    const newHash = `#/${hashPath || 'auth'}?${hashParams.toString()}`;
    return redirect(`${target.origin}${target.pathname}${target.search}${newHash}`);
  } catch (e) {
    console.error('social-auth error:', e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
