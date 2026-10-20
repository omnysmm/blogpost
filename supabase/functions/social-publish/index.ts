// social-publish — server-side proxy for VK / YouTube / TikTok publish
// Deploy: supabase functions deploy social-publish
// Secrets: none required (tokens arrive per-request from the client settings)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(String(b64 || "").replace(/\s/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid JSON" });
  }

  const network = String(body.network || "");

  try {
    // ── VK ──
    if (network === "vk") {
      const method = String(body.action || body.method || "wall.post");
      const params = body.params || body;
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (k === "network" || k === "action" || k === "method" || k === "params") continue;
        if (v == null || v === "") continue;
        form.append(k, String(v));
      }
      if (!form.has("v")) form.append("v", "5.199");

      if (method === "upload-photo" || body.uploadUrl) {
        const uploadUrl = String(body.uploadUrl || "");
        const bytes = b64ToBytes(body.photoBase64);
        const fd = new FormData();
        fd.append("photo", new Blob([bytes], { type: body.photoMime || "image/jpeg" }), "image.jpg");
        const r = await fetch(uploadUrl, { method: "POST", body: fd });
        return json(r.status, await r.json().catch(() => ({ error: "upload failed" })));
      }

      const r = await fetch(`https://api.vk.com/method/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });
      return json(200, await r.json().catch(() => ({ error: { error_msg: "VK parse error" } })));
    }

    // ── YouTube ──
    if (network === "youtube") {
      const action = String(body.action || "upload");
      const token = String(body.accessToken || body.access_token || "");
      if (!token) return json(400, { error: "missing accessToken" });

      if (action === "channels") {
        const r = await fetch(
          "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return json(r.status, await r.json().catch(() => ({ error: "channels failed" })));
      }

      // resumable upload
      const bytes = b64ToBytes(body.videoBase64);
      const meta = {
        snippet: {
          title: String(body.title || "BlogPost video").slice(0, 100),
          description: String(body.description || "").slice(0, 4800),
          categoryId: "22",
        },
        status: {
          privacyStatus: body.privacyStatus || "public",
          selfDeclaredMadeForKids: false,
        },
      };
      const init = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
            "X-Upload-Content-Length": String(bytes.length),
            "X-Upload-Content-Type": body.videoMime || "video/mp4",
          },
          body: JSON.stringify(meta),
        }
      );
      const location = init.headers.get("location");
      if (!location) {
        const errText = await init.text();
        return json(init.status || 502, { error: errText || "no upload session" });
      }
      const up = await fetch(location, {
        method: "PUT",
        headers: {
          "Content-Type": body.videoMime || "video/mp4",
          "Content-Length": String(bytes.length),
        },
        body: bytes,
      });
      const raw = await up.text();
      if (!up.ok) return json(up.status, { error: raw || "upload failed" });
      const data = JSON.parse(raw);
      return json(200, {
        success: true,
        videoId: data?.id,
        id: data?.id,
        url: data?.id ? `https://youtu.be/${data.id}` : undefined,
      });
    }

    // ── TikTok ──
    if (network === "tiktok") {
      const action = String(body.action || "publish");
      const token = String(body.accessToken || body.access_token || "");
      if (!token) return json(400, { error: "missing accessToken" });

      if (action === "user") {
        const fields = "open_id,display_name,avatar_url";
        const r = await fetch(
          `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return json(r.status, await r.json().catch(() => ({ error: "user info failed" })));
      }

      const postInfo = {
        title: String(body.title || "BlogPost").slice(0, 2200),
        privacy_level: "SELF_ONLY",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      };

      let source: any;
      if (body.mode === "pull" && body.videoUrl) {
        source = { source: "PULL_FROM_URL", video_url: body.videoUrl };
      } else {
        const bytes = b64ToBytes(body.videoBase64);
        source = {
          source: "FILE_UPLOAD",
          video_size: bytes.length,
          chunk_size: bytes.length,
          total_chunk_count: 1,
        };
      }

      const init = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ post_info: postInfo, source_info: source }),
      });
      const initData = await init.json().catch(() => ({}));
      if (!init.ok || initData?.error?.code) {
        return json(init.status || 400, {
          error: initData?.error?.message || initData?.error?.code || "TikTok init failed",
          detail: initData,
        });
      }
      const publishId = initData?.data?.publish_id;
      const uploadUrl = initData?.data?.upload_url;
      if (body.mode !== "pull" && uploadUrl) {
        const bytes = b64ToBytes(body.videoBase64);
        const put = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "video/mp4",
            "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}`,
          },
          body: bytes,
        });
        if (!put.ok) {
          return json(put.status, { error: await put.text(), publishId });
        }
      }
      return json(200, { success: true, publishId, publish_id: publishId });
    }

    // ── Instagram Graph API ──
    if (network === "instagram") {
      const action = String(body.action || "publish");
      const token = String(body.accessToken || body.access_token || "");
      if (!token) return json(400, { error: "missing accessToken" });

      const graph = async (path: string, method: string, params: Record<string, string> = {}) => {
        const url = new URL(`https://graph.facebook.com/v19.0${path}`);
        url.searchParams.set("access_token", token);
        if (method === "GET") {
          for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
          const r = await fetch(url.toString());
          return r.json();
        }
        const form = new URLSearchParams({ access_token: token, ...params });
        const r = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form,
        });
        return r.json();
      };

      if (action === "me" || action === "test") {
        const me = await graph("/me", "GET", {
          fields: "instagram_business_account{id,username},instagram_scoped_user_id,id,name",
        });
        return json(200, me);
      }

      const igUserId = String(body.igUserId || body.accountId || "");
      const mediaUrl = String(body.videoUrl || body.imageUrl || "");
      const caption = String(body.caption || body.title || "").slice(0, 2200);
      const isVideo = !!body.videoUrl;
      if (!igUserId) return json(400, { error: "missing igUserId" });
      if (!mediaUrl.startsWith("http")) {
        return json(400, { error: "Instagram requires a public https media URL" });
      }

      const container = await graph(`/${igUserId}/media`, "POST", {
        [isVideo ? "video_url" : "image_url"]: mediaUrl,
        caption,
        ...(isVideo ? { media_type: "REELS" } : {}),
      });
      const creationId = container?.id;
      if (!creationId) return json(400, { error: container?.error?.message || "media container failed" });

      const published = await graph(`/${igUserId}/media_publish`, "POST", {
        creation_id: creationId,
      });
      if (!published?.id) return json(400, { error: published?.error?.message || "publish failed" });
      return json(200, { success: true, mediaId: String(published.id) });
    }

    // ── OK.ru ──
    if (network === "ok") {
      const action = String(body.action || body.method || "mediatopic.post");
      const accessToken = String(body.accessToken || body.access_token || "");
      const appKey = String(body.applicationKey || body.application_key || "");
      const secret = String(body.secretKey || body.secret_key || "");
      if (!accessToken) return json(400, { error: "missing accessToken" });
      if (!appKey) return json(400, { error: "missing applicationKey" });

      const inner = body.params || {};
      const sigParams: Record<string, string> = {
        application_key: appKey,
        format: "json",
      };
      for (const [k, v] of Object.entries(inner)) {
        if (v == null || v === "") continue;
        if (k === "network" || k === "action" || k === "method" || k === "params") continue;
        sigParams[k] = String(v);
      }
      const keys = Object.keys(sigParams).sort();
      let raw = "";
      for (const k of keys) raw += k + "=" + sigParams[k];
      raw += secret;
      const msgUint8 = new TextEncoder().encode(raw);
      const hashBuffer = await crypto.subtle.digest("MD5", msgUint8).catch(async () => {
        // Deno may not expose MD5 in SubtleCrypto — fallback to a tiny JS md5
        return jsMd5(raw);
      });
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sig = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const form = new URLSearchParams();
      form.append("application_key", appKey);
      form.append("access_token", accessToken);
      form.append("format", "json");
      for (const [k, v] of Object.entries(inner)) {
        if (v == null || v === "") continue;
        form.append(k, String(v));
      }
      form.append("sig", sig);

      if (action === "upload-photo") {
        const bytes = b64ToBytes(body.photoBase64);
        const fd = new FormData();
        fd.append("pic1", new Blob([bytes], { type: body.photoMime || "image/jpeg" }), "image.jpg");
        const r = await fetch(String(body.uploadUrl || ""), { method: "POST", body: fd });
        return json(r.status, await r.json().catch(() => ({ error: "ok upload failed" })));
      }

      const r = await fetch("https://api.ok.ru/fb.do", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });
      return json(200, await r.json().catch(() => ({ error: "OK parse error" })));
    }

    // ── Rutube ──
    if (network === "rutube") {
      const action = String(body.action || "upload");
      const apiKey = String(body.apiKey || body.access_token || "");
      if (!apiKey) return json(400, { error: "missing apiKey" });
      const headers = { "Rutube-Api-Key": apiKey };

      if (action === "me") {
        const r = await fetch("https://rutube.ru/api/whoami/", { headers });
        return json(r.status, await r.json().catch(() => ({ error: "rutube me failed" })));
      }

      if (action === "from-url") {
        const r = await fetch("https://rutube.ru/api/video/from_url/", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            url: body.url,
            title: String(body.title || "BlogPost video").slice(0, 150),
            description: String(body.description || "").slice(0, 5000),
            is_private: !!body.isPrivate,
          }),
        });
        const data = await r.json().catch(() => ({}));
        const videoId = data?.id || data?.video_id;
        return json(r.ok && videoId ? 200 : r.status || 400, {
          success: !!videoId,
          videoId: videoId != null ? String(videoId) : undefined,
          url: videoId ? `https://rutube.ru/video/${videoId}/` : undefined,
          error: !videoId ? data?.detail || data?.error || "Rutube from_url failed" : undefined,
        });
      }

      // upload
      const bytes = b64ToBytes(body.videoBase64);
      const fd = new FormData();
      fd.append("title", String(body.title || "BlogPost video").slice(0, 150));
      fd.append("description", String(body.description || "").slice(0, 5000));
      fd.append("is_private", body.isPrivate ? "1" : "0");
      fd.append("file", new Blob([bytes], { type: body.videoMime || "video/mp4" }), "video.mp4");
      const r = await fetch("https://rutube.ru/api/video/upload/", {
        method: "POST",
        headers,
        body: fd,
      });
      const data = await r.json().catch(() => ({}));
      const videoId = data?.id || data?.video_id;
      return json(r.ok && videoId ? 200 : r.status || 400, {
        success: !!videoId,
        videoId: videoId != null ? String(videoId) : undefined,
        url: videoId ? `https://rutube.ru/video/${videoId}/` : undefined,
        error: !videoId ? data?.detail || data?.error || "Rutube upload failed" : undefined,
      });
    }

    return json(400, { error: `unknown network: ${network}` });
  } catch (e: any) {
    return json(502, { error: e?.message || "social-publish error" });
  }
});

/** Minimal MD5 (hex) for OK request signing when SubtleCrypto lacks MD5. */
function jsMd5(input: string): ArrayBuffer {
  // Prefer Deno/Node crypto via npm: if available — otherwise a compact MD5.
  // deno-lint-ignore no-explicit-any
  const g: any = globalThis as any;
  try {
    if (g.Deno?.read) {
      // no-op placeholder — real path uses crypto.subtle fallback caller
    }
  } catch {
    /* ignore */
  }
  // Compact MD5 implementation
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = (a + q + x + t) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function toUtf8(str: string) {
    return new TextEncoder().encode(str);
  }
  function bytesToWords(bytes: Uint8Array) {
    const words: number[] = [];
    for (let i = 0; i < bytes.length; i++) {
      words[i >> 2] |= bytes[i] << ((i % 4) * 8);
    }
    return words;
  }
  const bytes = toUtf8(input);
  const n = bytes.length * 8;
  const words = bytesToWords(bytes);
  words[n >> 5] |= 0x80 << (n % 32);
  words[(((n + 64) >>> 9) << 4) + 14] = n;
  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;
  for (let i = 0; i < words.length; i += 16) {
    const oa = a;
    const ob = b;
    const oc = c;
    const od = d;
    a = ff(a, b, c, d, words[i + 0], 7, -680876936);
    d = ff(d, a, b, c, words[i + 1], 12, -389564586);
    c = ff(c, d, a, b, words[i + 2], 17, 606105819);
    b = ff(b, c, d, a, words[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, words[i + 4], 7, -176418897);
    d = ff(d, a, b, c, words[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, words[i + 6], 17, -1473231341);
    b = ff(b, c, d, a, words[i + 7], 22, -45705983);
    a = ff(a, b, c, d, words[i + 8], 7, 1770035416);
    d = ff(d, a, b, c, words[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, words[i + 10], 17, -42063);
    b = ff(b, c, d, a, words[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, words[i + 12], 7, 1804603682);
    d = ff(d, a, b, c, words[i + 13], 12, -40341101);
    c = ff(c, d, a, b, words[i + 14], 17, -1502002290);
    b = ff(b, c, d, a, words[i + 15], 22, 1236535329);
    a = gg(a, b, c, d, words[i + 1], 5, -165796510);
    d = gg(d, a, b, c, words[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, words[i + 11], 14, 643717713);
    b = gg(b, c, d, a, words[i + 0], 20, -373897302);
    a = gg(a, b, c, d, words[i + 5], 5, -701558691);
    d = gg(d, a, b, c, words[i + 10], 9, 38016083);
    c = gg(c, d, a, b, words[i + 15], 14, -660478335);
    b = gg(b, c, d, a, words[i + 4], 20, -405537848);
    a = gg(a, b, c, d, words[i + 9], 5, 568446438);
    d = gg(d, a, b, c, words[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, words[i + 3], 14, -187363961);
    b = gg(b, c, d, a, words[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, words[i + 13], 5, -1444681467);
    d = gg(d, a, b, c, words[i + 2], 9, -51403784);
    c = gg(c, d, a, b, words[i + 7], 14, 1735328473);
    b = gg(b, c, d, a, words[i + 12], 20, -1926607734);
    a = hh(a, b, c, d, words[i + 5], 4, -378558);
    d = hh(d, a, b, c, words[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, words[i + 11], 16, 1839030562);
    b = hh(b, c, d, a, words[i + 14], 23, -35309556);
    a = hh(a, b, c, d, words[i + 1], 4, -1530992060);
    d = hh(d, a, b, c, words[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, words[i + 7], 16, -155497632);
    b = hh(b, c, d, a, words[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, words[i + 13], 4, 681279174);
    d = hh(d, a, b, c, words[i + 0], 11, -358537222);
    c = hh(c, d, a, b, words[i + 3], 16, -722521979);
    b = hh(b, c, d, a, words[i + 6], 23, 76029189);
    a = hh(a, b, c, d, words[i + 9], 4, -640364487);
    d = hh(d, a, b, c, words[i + 12], 11, -421815835);
    c = hh(c, d, a, b, words[i + 15], 16, 530742520);
    b = hh(b, c, d, a, words[i + 2], 23, -995338651);
    a = ii(a, b, c, d, words[i + 0], 6, -198630844);
    d = ii(d, a, b, c, words[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, words[i + 14], 15, -1416354905);
    b = ii(b, c, d, a, words[i + 5], 21, -57434055);
    a = ii(a, b, c, d, words[i + 12], 6, 1700485571);
    d = ii(d, a, b, c, words[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, words[i + 10], 15, -1051523);
    b = ii(b, c, d, a, words[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, words[i + 8], 6, 1873313359);
    d = ii(d, a, b, c, words[i + 15], 10, -30611744);
    c = ii(c, d, a, b, words[i + 6], 15, -1560198380);
    b = ii(b, c, d, a, words[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, words[i + 4], 6, -145523070);
    d = ii(d, a, b, c, words[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, words[i + 2], 15, 718787259);
    b = ii(b, c, d, a, words[i + 9], 21, -343485551);
    a = (a + oa) | 0;
    b = (b + ob) | 0;
    c = (c + oc) | 0;
    d = (d + od) | 0;
  }
  const out = new Uint8Array(16);
  const vals = [a, b, c, d];
  for (let i = 0; i < 4; i++) {
    out[i * 4 + 0] = (vals[i] >>> 0) & 0xff;
    out[i * 4 + 1] = (vals[i] >>> 8) & 0xff;
    out[i * 4 + 2] = (vals[i] >>> 16) & 0xff;
    out[i * 4 + 3] = (vals[i] >>> 24) & 0xff;
  }
  return out.buffer;
}
