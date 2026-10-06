// social-publish Edge Function
// Publishes content to a social network using tokens from social_accounts.
// Supports: vk, ok (API). Telegram is handled by telegram-publish.
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

function admin() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Adapt content length/format per network. */
function adaptContent(network: string, content: string): string {
  const text = stripHtml(content);
  switch (network) {
    case 'vk':
      return text.length > 5000 ? text.slice(0, 4990) + '…' : text;
    case 'ok':
      return text.length > 4000 ? text.slice(0, 3990) + '…' : text;
    case 'telegram':
      return text.length > 4000 ? text.slice(0, 3990) + '…' : text;
    case 'rutube':
      return text.length > 2000 ? text.slice(0, 1990) + '…' : text;
    default:
      return text.length > 2200 ? text.slice(0, 2190) + '…' : text;
  }
}

async function publishVk(accessToken: string, ownerId: string, message: string, imageUrl?: string) {
  let attachments = '';

  if (imageUrl && imageUrl.startsWith('data:')) {
    // Get upload server
    const serverRes = await fetch(
      `https://api.vk.com/method/photos.getWallUploadServer?access_token=${accessToken}&v=5.131`
    );
    const serverData = await serverRes.json();
    const uploadUrl = serverData.response?.upload_url;
    if (uploadUrl) {
      const base64 = imageUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.append('photo', new Blob([bytes], { type: 'image/png' }), 'photo.png');
      const upRes = await fetch(uploadUrl, { method: 'POST', body: form });
      const upData = await upRes.json();
      if (upData.photo && upData.server && upData.hash) {
        const saveRes = await fetch(
          `https://api.vk.com/method/photos.saveWallPhoto?access_token=${accessToken}&v=5.131` +
            `&photo=${encodeURIComponent(upData.photo)}&server=${upData.server}&hash=${encodeURIComponent(upData.hash)}` +
            (ownerId ? `&group_id=${ownerId}` : '')
        );
        const saveData = await saveRes.json();
        const saved = saveData.response?.[0];
        if (saved) attachments = `photo${saved.owner_id}_${saved.id}`;
      }
    }
  }

  const body = new URLSearchParams({
    message,
    v: '5.131',
    access_token: accessToken,
    from_group: '1',
  });
  if (ownerId) body.set('owner_id', ownerId.startsWith('-') ? ownerId : `-${ownerId}`);
  if (attachments) body.set('attachments', attachments);

  const res = await fetch('https://api.vk.com/method/wall.post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (data.error) throw new Error(`VK: ${data.error.error_msg}`);
  return { postId: String(data.response?.post_id || '') };
}

async function publishOk(accessToken: string, userId: string, message: string, imageUrl?: string) {
  // OK requires Sig = md5(access_token params + session_secret) for some methods;
  // using attach activity which works with access_token alone for many apps.
  const params: Record<string, string> = {
    method: 'stream.publish',
    type: 'STATUS',
    message: message.slice(0, 400),
    access_token: accessToken,
    format: 'json',
  };

  // Prefer photo attachment when present
  if (imageUrl && imageUrl.startsWith('data:')) {
    // Simplified: publish status without photo upload (OK photo upload is multi-step)
  }

  const query = new URLSearchParams(params).toString();
  const res = await fetch(`https://api.ok.ru/fb.do?${query}`);
  const data = await res.json();
  if (data.error) throw new Error(`OK: ${data.error.error_msg || JSON.stringify(data.error)}`);
  return { postId: String(data.attachment_ids || data.success || '') };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const body = await req.json();
    const userId = String(body.userId || '');
    const network = String(body.network || '');
    const content = String(body.content || '');
    const imageUrl = body.imageUrl ? String(body.imageUrl) : undefined;

    if (!userId || !network || !content) {
      return json({ error: 'userId, network, content are required' }, 400);
    }

    const db = admin();
    const { data: accounts, error } = await db
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('network', network)
      .eq('connected', true)
      .limit(1);

    if (error) throw new Error(error.message);
    const acc = accounts?.[0];
    if (!acc?.access_token) {
      return json({ success: false, error: `No access token for ${network}. Connect the account first.` }, 400);
    }

    const message = adaptContent(network, content);

    let result: { postId?: string };
    switch (network) {
      case 'vk':
        result = await publishVk(acc.access_token, acc.account_id || '', message, imageUrl);
        break;
      case 'ok':
        result = await publishOk(acc.access_token, acc.account_id || '', message, imageUrl);
        break;
      default:
        return json(
          { success: false, error: `Network ${network} is not supported by social-publish yet. Use telegram-publish for Telegram.` },
          400
        );
    }

    return json({ success: true, ...result, network });
  } catch (e) {
    console.error('social-publish error:', e);
    return json({ success: false, error: String(e?.message || e) }, 500);
  }
});
