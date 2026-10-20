import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import crypto from "node:crypto";

/** Local template-based content generator (last resort when all APIs are down) */
function generateLocalContent(prompt, language) {
  // Extract topic from prompt — look for quoted text or use the prompt itself
  const topicMatch = prompt.match(/["«]([^"»]+)["»]/);
  const topic = topicMatch ? topicMatch[1] : prompt.replace(/^(создай пост|напиши статью|write a post|write an article).*?[:.]?\s*/i, "").slice(0, 100).trim() || "interesting topic";

  // Detect content type from prompt
  const isArticle = /стать|article/i.test(prompt);
  const isVideo = /сценар|видео|video|script/i.test(prompt);
  const isMusic = /песн|музык|song|lyrics|music/i.test(prompt);
  const isVoiceover = /озвуч|voiceover|voice/i.test(prompt);
  const isEditing = /монтаж|editing|plan/i.test(prompt);

  if (language === "ru") {
    if (isArticle) {
      return `# ${topic}: полное руководство

${topic} — это тема, которая волнует многих. В этой статье мы разберём всё подробно.

## Что такое ${topic}?

${topic} представляет собой важную область, которая заслуживает внимания каждого, кто хочет быть в курсе современных тенденций.

## Почему это важно?

Исследования показывают, что понимание ${topic} помогает принимать более обоснованные решения и достигать лучших результатов.

## Практические советы

1. **Начните с основ** — изучите фундаментальные принципы ${topic}.
2. **Применяйте на практике** — теория без практики бесполезна.
3. **Делитесь опытом** — обсуждайте ${topic} с единомышленниками.

## Заключение

${topic} — это не просто модное слово, а реальный инструмент для роста. Начните использовать эти знания уже сегодня!

#BlogPost #${topic.replace(/\s+/g, "")}

👇 А как вы относитесь к теме «${topic}»? Напишите в комментариях, поставьте лайк и сохраните пост!`;
    }

    if (isVideo) {
      return `🎬 Видеоролик: ${topic}

00:00 — Вступление
«Привет! Сегодня поговорим о ${topic}»

00:15 — Основная часть
Рассказ о ключевых аспектах ${topic}. Визуальные примеры, инфографика.

01:30 — Практические советы
3 главных лайфхака по теме ${topic}.

02:30 — Заключение
«Подписывайтесь и ставьте лайк! В комментариях расскажите о своём опыте с ${topic}»

#BlogPost #${topic.replace(/\s+/g, "")}

👇 А как вы относитесь к этой теме? Напишите в комментариях, поставьте лайк и сохраните пост!`;
    }

    if (isMusic) {
      return `🎵 Песня: ${topic}

Куплет 1:
Тема ${topic} вдохновляет,
Каждый день что-то меняет,
Мы идём вперёд с мечтой,
Верь в себя и будь собой.

Припев:
${topic} — это наш путь,
Будем вместе как-нибудь!
Лайк поставь и подписывайся,
В наш канал — не отрывайся!

Бридж:
Мир полон возможностей,
${topic} — ключ к чудесностям.

#BlogPost #${topic.replace(/\s+/g, "")}`;
    }

    // Default post
    return `✨ ${topic} — то, что нужно знать каждому!

Решили разобраться в теме «${topic}»? Тогда читайте внимательно — будет полезно!

🔹 ${topic} открывает новые возможности для тех, кто готов действовать.
🔹 Эксперты рекомендуют уделять внимание ${topic} уже сегодня.
🔹 А вы уже пробовали применить ${topic} на практике?

Расскажите в комментариях о своём опыте! 👇

#BlogPost #${topic.replace(/\s+/g, "")} #советы #полезное

👇 А как вы относитесь к этой теме? Напишите в комментариях, поставьте лайк и сохраните пост!`;
  }

  // English
  if (isArticle) {
    return `# ${topic}: A Complete Guide

${topic} is a subject that deserves your full attention. Let's explore it together.

## What is ${topic}?

Understanding ${topic} can open new doors and help you make better decisions.

## Why It Matters

Studies show that people who grasp ${topic} achieve significantly better results.

## Practical Tips

1. **Start with the basics** — learn the fundamentals.
2. **Practice daily** — theory without action is useless.
3. **Share your experience** — discuss with like-minded people.

## Conclusion

${topic} is not just a buzzword — it's a real tool for growth. Start today!

#BlogPost #${topic.replace(/\s+/g, "")}

👇 What do you think about "${topic}"? Drop a comment, like this post, and save it for later!`;
  }

  return `✨ ${topic} — what everyone should know!

🔹 ${topic} opens new opportunities for those ready to act.
🔹 Experts recommend paying attention to ${topic} today.
🔹 Have you tried applying ${topic} in practice?

Share your experience in the comments! 👇

#BlogPost #${topic.replace(/\s+/g, "")}

👇 What do you think? Drop a comment, like this post, and save it for later!`;
}

/** Server-side LLM proxy — avoids browser CORS / bot blocks */
function aiProxyPlugin() {
  return {
    name: "ai-proxy",
    configureServer(server) {
      server.middlewares.use("/api/generate", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("POST only");
          return;
        }
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", async () => {
          try {
            const rawBody = Buffer.concat(chunks).toString("utf8").replace(/^\uFEFF/, "");
            const body = JSON.parse(rawBody || "{}");
            const prompt = String(body.prompt || "");
            const system = String(body.system || "Write clearly on the topic.");
            const language = body.language === "en" ? "en" : "ru";

            const messages = [
              { role: "system", content: system },
              { role: "user", content: prompt },
            ];

            // ═══ Fallback 1: Pollinations.ai OpenAI-compatible ═══
            const pollinationsModels = ["openai", "openai-fast"];
            for (const model of pollinationsModels) {
              try {
                const r = await fetch("https://text.pollinations.ai/openai", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Accept: "application/json" },
                  body: JSON.stringify({ model, messages, max_tokens: 1200, temperature: 0.7 }),
                  signal: AbortSignal.timeout(60000),
                });
                const raw = await r.text();
                if (!r.ok) { console.warn("[ai-proxy] pollinations", model, r.status); continue; }
                const data = JSON.parse(raw);
                const text = data?.choices?.[0]?.message?.content || data?.text || "";
                if (String(text).trim().length > 20) {
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json; charset=utf-8");
                  res.end(JSON.stringify({ text: String(text).replace(/^[\s\S]*?<\/think>/i, "").trim() }));
                  return;
                }
              } catch (e) {
                console.warn("[ai-proxy] pollinations", model, "error:", e.message);
              }
            }

            // ═══ Fallback 2: OpenRouter free models ═══
            const openrouterModels = [
              "google/gemma-2-9b-it:free",
              "mistralai/mistral-7b-instruct:free",
              "meta-llama/llama-3-8b-instruct:free",
            ];
            for (const model of openrouterModels) {
              try {
                const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "HTTP-Referer": "https://blogpost.app",
                    "X-Title": "BlogPost",
                  },
                  body: JSON.stringify({ model, messages, max_tokens: 1200, temperature: 0.7 }),
                  signal: AbortSignal.timeout(60000),
                });
                const raw = await r.text();
                if (!r.ok) { console.warn("[ai-proxy] openrouter", model, r.status); continue; }
                const data = JSON.parse(raw);
                const text = data?.choices?.[0]?.message?.content || "";
                if (String(text).trim().length > 20) {
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json; charset=utf-8");
                  res.end(JSON.stringify({ text: String(text).replace(/^[\s\S]*?<\/think>/i, "").trim() }));
                  return;
                }
              } catch (e) {
                console.warn("[ai-proxy] openrouter", model, "error:", e.message);
              }
            }

            // ═══ Fallback 3: Pollinations simple GET ═══
            try {
              const simple = `https://text.pollinations.ai/${encodeURIComponent(prompt.slice(0, 1500))}`;
              const r = await fetch(simple, {
                signal: AbortSignal.timeout(90000),
                headers: { Accept: "text/plain" },
              });
              const raw = await r.text();
              const text = String(raw).replace(/^[\s\S]*?<\/think>/i, "").trim();
              if (r.ok && text.length > 20) {
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ text }));
                return;
              }
            } catch (e) {
              console.warn("[ai-proxy] pollinations simple error:", e.message);
            }

            // ═══ Fallback 4: Local template generator ═══
            const text = generateLocalContent(prompt, language);
            if (text) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ text }));
              return;
            }

            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "all upstreams failed" }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: (e && e.message) || "proxy error" }));
          }
        });
      });

      // AI images — server-side fetch with retries
      server.middlewares.use("/api/image", (req, res) => {
        const q = req.url || "";
        const promptMatch = q.match(/[?&]prompt=([^&]*)/);
        const rawPrompt = decodeURIComponent((promptMatch && promptMatch[1]) || "beautiful photo");
        // Keep prompt short — long prompts make the upstream stall
        const prompt = rawPrompt.replace(/\s+/g, " ").trim().slice(0, 180);
        const width = 768;
        const height = 480;
        const seed = Math.floor(Math.random() * 1000000);

        const urls = [
          `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`,
          `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 80))}?width=${width}&height=${height}&nologo=true&seed=${seed}`,
          `https://dummyimage.com/${width}x${height}/6366f1/ffffff.png&text=${encodeURIComponent(prompt.slice(0, 40))}`,
        ];

        (async () => {
          for (const url of urls) {
            for (let attempt = 0; attempt < 2; attempt++) {
              try {
                const r = await fetch(url, {
                  signal: AbortSignal.timeout(75000),
                  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
                });
                if (!r.ok) continue;
                const buf = Buffer.from(await r.arrayBuffer());
                const type = (r.headers.get("content-type") || "").toLowerCase();
                if (buf.length > 400 && (type.startsWith("image/") || buf[0] === 0xff || buf[0] === 0x89)) {
                  res.statusCode = 200;
                  res.setHeader("Content-Type", type.startsWith("image/") ? type : "image/jpeg");
                  res.setHeader("Cache-Control", "no-store");
                  res.end(buf);
                  return;
                }
              } catch (e) {
                console.warn("image upstream failed", url.slice(0, 70), (e && e.message) || e);
              }
            }
          }
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "image generation failed" }));
        })();
      });

      server.middlewares.use("/api/generate-health", (_req, res) => {
        res.statusCode = 200;
        res.end("ok");
      });

      // Telegram Bot API proxy — avoids browser CORS / Failed to fetch on api.telegram.org
      // Photos arrive as JSON { photoBase64 } and are packed as multipart here (no FormData in browser).
      function buildTelegramMultipart(fields, fileBuf, mime, filename) {
        const boundary = "----BlogPostForm" + Math.random().toString(16).slice(2);
        const chunks = [];
        for (const [name, value] of Object.entries(fields)) {
          if (value == null || value === "") continue;
          chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${String(value)}\r\n`));
        }
        chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${filename || "image.jpg"}"\r\nContent-Type: ${mime || "image/jpeg"}\r\n\r\n`));
        chunks.push(Buffer.isBuffer(fileBuf) ? fileBuf : Buffer.from(fileBuf));
        chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
        return {
          body: Buffer.concat(chunks),
          contentType: `multipart/form-data; boundary=${boundary}`,
        };
      }

      server.middlewares.use("/api/telegram", (req, res) => {
        const q = req.url || "";
        // Support both /sendPhoto (mount-stripped) and /api/telegram/sendPhoto (full path)
        const method =
          q.replace(/^\/+/, "").split("?")[0].split("/").pop() || "sendMessage";
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", async () => {
          try {
            const raw = Buffer.concat(chunks);
            const token = req.headers["x-telegram-bot-token"];
            if (!token) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, description: "missing bot token" }));
              return;
            }

            const contentType = String(req.headers["content-type"] || "");
            let body = raw;
            let outContentType = contentType;

            if (contentType.includes("application/json") && raw.length) {
              const parsed = JSON.parse(raw.toString("utf8"));
              const photoBase64 = parsed.photoBase64;
              const dataUrlPhoto = parsed.photo && String(parsed.photo).startsWith("data:") ? String(parsed.photo) : "";

              if (photoBase64 || dataUrlPhoto) {
                let buf;
                let mime = parsed.photoMime || "image/jpeg";
                if (photoBase64) {
                  buf = Buffer.from(String(photoBase64).replace(/\s/g, ""), "base64");
                  mime = parsed.photoMime || mime;
                } else {
                  const comma = dataUrlPhoto.indexOf(",");
                  const meta = dataUrlPhoto.slice(5, comma);
                  mime = (meta.split(";")[0] || "image/jpeg");
                  buf = Buffer.from(dataUrlPhoto.slice(comma + 1).replace(/\s/g, ""), "base64");
                }
                const mp = buildTelegramMultipart(
                  {
                    chat_id: String(parsed.chat_id ?? parsed.chatId ?? ""),
                    caption: String(parsed.caption ?? ""),
                    parse_mode: String(parsed.parse_mode || "HTML"),
                  },
                  buf,
                  mime,
                  parsed.photoName || "image.jpg"
                );
                const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
                  method: "POST",
                  headers: { "Content-Type": mp.contentType },
                  body: mp.body,
                  signal: AbortSignal.timeout(120000),
                });
                const text = await r.text();
                res.statusCode = r.status;
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(text);
                return;
              }

              if (!parsed.token) parsed.token = token;
              body = Buffer.from(JSON.stringify(parsed), "utf8");
              outContentType = "application/json";
            }

            const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
              method: "POST",
              headers: outContentType ? { "Content-Type": outContentType } : {},
              body,
              signal: AbortSignal.timeout(120000),
            });
            const text = await r.text();
            res.statusCode = r.status;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(text);
          } catch (e) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, description: (e && e.message) || "telegram proxy error" }));
          }
        });
      });

      // ═══ Social publish proxies: VK / YouTube / TikTok (CORS-safe) ═══
      function readJsonBody(req) {
        return new Promise((resolve, reject) => {
          const chunks = [];
          req.on("data", (c) => chunks.push(c));
          req.on("end", () => {
            try {
              const raw = Buffer.concat(chunks);
              if (!raw.length) return resolve({});
              // Strip UTF-8 BOM — breaks JSON.parse
              let text = raw.toString("utf8");
              if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
              resolve(JSON.parse(text));
            } catch (e) {
              reject(e);
            }
          });
          req.on("error", reject);
        });
      }

      function sendJson(res, status, obj) {
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(obj));
      }

      function b64ToBuffer(b64) {
        return Buffer.from(String(b64 || "").replace(/\s/g, ""), "base64");
      }

      function buildMultipart(fields, fileField, fileBuf, mime, filename) {
        const boundary = "----BlogPostSocial" + Math.random().toString(16).slice(2);
        const chunks = [];
        for (const [name, value] of Object.entries(fields)) {
          if (value == null || value === "") continue;
          chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${String(value)}\r\n`));
        }
        if (fileBuf) {
          chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${filename || "file.bin"}"\r\nContent-Type: ${mime || "application/octet-stream"}\r\n\r\n`));
          chunks.push(Buffer.isBuffer(fileBuf) ? fileBuf : Buffer.from(fileBuf));
          chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
        } else {
          chunks.push(Buffer.from(`--${boundary}--\r\n`));
        }
        return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
      }

      // ── VK ──
      server.middlewares.use("/api/vk/method", (req, res) => {
        (async () => {
          try {
            const parsed = await readJsonBody(req);
            const method = String(parsed.method || "wall.post");
            const params = parsed.params || {};
            const body = new URLSearchParams();
            for (const [k, v] of Object.entries(params)) {
              if (v == null || v === "") continue;
              body.append(k, String(v));
            }
            const r = await fetch(`https://api.vk.com/method/${method}`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body,
              signal: AbortSignal.timeout(60000),
            });
            const text = await r.text();
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(text);
          } catch (e) {
            sendJson(res, 502, { error: { error_msg: (e && e.message) || "vk proxy error" } });
          }
        })();
      });

      server.middlewares.use("/api/vk/upload-photo", (req, res) => {
        (async () => {
          try {
            const parsed = await readJsonBody(req);
            const uploadUrl = parsed.uploadUrl;
            if (!uploadUrl) return sendJson(res, 400, { error: "missing uploadUrl" });
            const buf = b64ToBuffer(parsed.photoBase64);
            const mp = buildMultipart({}, "photo", buf, parsed.photoMime || "image/jpeg", parsed.photoName || "image.jpg");
            const r = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": mp.contentType },
              body: mp.body,
              signal: AbortSignal.timeout(120000),
            });
            const text = await r.text();
            res.statusCode = r.status;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(text);
          } catch (e) {
            sendJson(res, 502, { error: (e && e.message) || "vk upload error" });
          }
        })();
      });

      // ── YouTube (Data API v3 resumable upload) ──
      server.middlewares.use("/api/youtube/upload", (req, res) => {
        (async () => {
          try {
            const parsed = await readJsonBody(req);
            const accessToken = parsed.accessToken;
            if (!accessToken) return sendJson(res, 400, { error: "missing accessToken" });
            const videoBuf = b64ToBuffer(parsed.videoBase64);
            if (!videoBuf.length) return sendJson(res, 400, { error: "empty video" });

            const meta = {
              snippet: {
                title: String(parsed.title || "BlogPost video").slice(0, 100),
                description: String(parsed.description || "").slice(0, 4800),
                categoryId: "22",
              },
              status: {
                privacyStatus: parsed.privacyStatus || "public",
                selfDeclaredMadeForKids: false,
              },
            };

            // Step 1: start resumable session
            const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json; charset=utf-8",
                "X-Upload-Content-Length": String(videoBuf.length),
                "X-Upload-Content-Type": parsed.videoMime || "video/mp4",
              },
              body: JSON.stringify(meta),
              signal: AbortSignal.timeout(60000),
            });
            const location = init.headers.get("location") || init.headers.get("Location");
            if (!location) {
              const errText = await init.text();
              return sendJson(res, init.status || 502, { error: errText || "no upload session" });
            }

            // Step 2: upload bytes
            const up = await fetch(location, {
              method: "PUT",
              headers: {
                "Content-Type": parsed.videoMime || "video/mp4",
                "Content-Length": String(videoBuf.length),
              },
              body: videoBuf,
              signal: AbortSignal.timeout(15 * 60 * 1000),
            });
            const raw = await up.text();
            if (!up.ok) return sendJson(res, up.status, { error: raw || "upload failed" });
            const data = JSON.parse(raw);
            const videoId = data?.id;
            sendJson(res, 200, {
              success: true,
              videoId,
              id: videoId,
              url: videoId ? `https://youtu.be/${videoId}` : undefined,
            });
          } catch (e) {
            sendJson(res, 502, { error: (e && e.message) || "youtube upload error" });
          }
        })();
      });

      server.middlewares.use("/api/youtube/channels", (req, res) => {
        (async () => {
          try {
            const parsed = await readJsonBody(req);
            const accessToken = parsed.accessToken;
            if (!accessToken) return sendJson(res, 400, { error: "missing accessToken" });
            const r = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
              headers: { Authorization: `Bearer ${accessToken}` },
              signal: AbortSignal.timeout(30000),
            });
            const text = await r.text();
            res.statusCode = r.status;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(text);
          } catch (e) {
            sendJson(res, 502, { error: (e && e.message) || "youtube channels error" });
          }
        })();
      });

      // ── TikTok Content Posting API v2 ──
      server.middlewares.use("/api/tiktok/user", (req, res) => {
        (async () => {
          try {
            const parsed = await readJsonBody(req);
            const accessToken = parsed.accessToken;
            if (!accessToken) return sendJson(res, 400, { error: "missing accessToken" });
            const fields = "open_id,display_name,avatar_url";
            const url = `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`;
            const r = await fetch(url, {
              headers: { Authorization: `Bearer ${accessToken}` },
              signal: AbortSignal.timeout(30000),
            });
            const text = await r.text();
            res.statusCode = r.status;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(text);
          } catch (e) {
            sendJson(res, 502, { error: (e && e.message) || "tiktok user error" });
          }
        })();
      });

      server.middlewares.use("/api/tiktok/publish", (req, res) => {
        (async () => {
          try {
            const parsed = await readJsonBody(req);
            const accessToken = parsed.accessToken;
            if (!accessToken) return sendJson(res, 400, { error: "missing accessToken" });

            const postInfo = {
              title: String(parsed.title || "BlogPost").slice(0, 2200),
              privacy_level: "SELF_ONLY", // safest default — user can change in TikTok
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
            };

            let source;
            if (parsed.mode === "pull" && parsed.videoUrl) {
              source = {
                source: "PULL_FROM_URL",
                video_url: parsed.videoUrl,
              };
            } else {
              // FILE_UPLOAD — create session, upload bytes, then status
              source = {
                source: "FILE_UPLOAD",
                video_size: b64ToBuffer(parsed.videoBase64).length,
                chunk_size: b64ToBuffer(parsed.videoBase64).length,
                total_chunk_count: 1,
              };
            }

            const initBody = {
              post_info: postInfo,
              source_info: source,
            };

            const init = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json; charset=utf-8",
              },
              body: JSON.stringify(initBody),
              signal: AbortSignal.timeout(60000),
            });
            const initData = await init.json().catch(() => ({}));
            if (!init.ok || initData?.error?.code) {
              return sendJson(res, init.status || 400, {
                error: initData?.error?.message || initData?.error?.code || "TikTok init failed",
                detail: initData,
              });
            }

            const publishId = initData?.data?.publish_id;
            const uploadUrl = initData?.data?.upload_url;

            // FILE_UPLOAD needs a PUT of video bytes
            if (parsed.mode !== "pull" && uploadUrl) {
              const buf = b64ToBuffer(parsed.videoBase64);
              const put = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                  "Content-Type": "video/mp4",
                  "Content-Range": `bytes 0-${buf.length - 1}/${buf.length}`,
                },
                body: buf,
                signal: AbortSignal.timeout(15 * 60 * 1000),
              });
              if (!put.ok) {
                const t = await put.text();
                return sendJson(res, put.status, { error: t || "TikTok upload failed", publishId });
              }
            }

            sendJson(res, 200, { success: true, publishId, publish_id: publishId });
          } catch (e) {
            sendJson(res, 502, { error: (e && e.message) || "tiktok publish error" });
          }
        })();
      });

      // ── Instagram Graph API ──
      server.middlewares.use("/api/instagram/graph", (req, res) => {
        (async () => {
          try {
            const parsed = await readJsonBody(req);
            const method = String(parsed.method || req.method || "GET").toUpperCase();
            const rawPath = String(parsed.path || (req.url || "").split("path=")[1] || "/me");
            const path = decodeURIComponent(rawPath.split("&")[0]);
            const token = String(parsed.access_token || parsed.accessToken || "");
            if (!token) return sendJson(res, 400, { error: "missing access_token" });

            const url = new URL(`https://graph.facebook.com/v19.0${path.startsWith("/") ? path : "/" + path}`);
            url.searchParams.set("access_token", token);
            if (method === "GET" && req.url && req.url.includes("?")) {
              const incoming = new URL(req.url, "http://localhost").searchParams;
              for (const [k, v] of incoming.entries()) {
                if (k === "path" || k === "access_token" || k === "accessToken") continue;
                if (v) url.searchParams.set(k, v);
              }
            }

            let body;
            if (method !== "GET") {
              const form = new URLSearchParams();
              form.set("access_token", token);
              for (const [k, v] of Object.entries(parsed)) {
                if (k === "path" || k === "method" || k === "access_token" || k === "accessToken") continue;
                if (v == null || v === "") continue;
                form.append(k, String(v));
              }
              body = form;
            }

            const r = await fetch(url.toString(), {
              method,
              headers: body
                ? { "Content-Type": "application/x-www-form-urlencoded" }
                : undefined,
              body,
              signal: AbortSignal.timeout(60000),
            });
            const text = await r.text();
            res.statusCode = r.status;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(text);
          } catch (e) {
            sendJson(res, 502, { error: (e && e.message) || "instagram graph error" });
          }
        })();
      });

      // ── OK.ru (fb.do + signed mediatopic) ──
      function okSign(params, secret) {
        const keys = Object.keys(params)
          .filter((k) => k !== "sig" && k !== "access_token" && params[k] != null && params[k] !== "")
          .sort();
        let raw = "";
        for (const k of keys) raw += k + "=" + String(params[k]);
        raw += secret || "";
        return crypto.createHash("md5").update(raw, "utf8").digest("hex");
      }

      server.middlewares.use("/api/ok/fb", (req, res) => {
        (async () => {
          try {
            const parsed = await readJsonBody(req);
            const accessToken = String(parsed.accessToken || "");
            const appKey = String(parsed.applicationKey || "");
            const secret = String(parsed.secretKey || "");
            const inner = parsed.params || {};
            if (!accessToken) return sendJson(res, 400, { error: "missing accessToken" });
            if (!appKey) return sendJson(res, 400, { error: "missing applicationKey" });

            const form = new URLSearchParams();
            form.append("application_key", appKey);
            form.append("access_token", accessToken);
            form.append("format", "json");
            for (const [k, v] of Object.entries(inner)) {
              if (v == null || v === "") continue;
              form.append(k, String(v));
            }
            const sigParams = { application_key: appKey, format: "json" };
            for (const [k, v] of Object.entries(inner)) {
              if (v == null || v === "") continue;
              sigParams[k] = String(v);
            }
            form.append("sig", okSign(sigParams, secret));

            const r = await fetch("https://api.ok.ru/fb.do", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: form,
              signal: AbortSignal.timeout(60000),
            });
            const text = await r.text();
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(text);
          } catch (e) {
            sendJson(res, 502, { error: (e && e.message) || "ok proxy error" });
          }
        })();
      });

      server.middlewares.use("/api/ok/upload-photo", (req, res) => {
        (async () => {
          try {
            const parsed = await readJsonBody(req);
            const uploadUrl = parsed.uploadUrl;
            if (!uploadUrl) return sendJson(res, 400, { error: "missing uploadUrl" });
            const buf = b64ToBuffer(parsed.photoBase64);
            const mp = buildMultipart({ pic1: "" }, "pic1", buf, parsed.photoMime || "image/jpeg", parsed.photoName || "image.jpg");
            // OK photo upload expects field "pic1"
            const boundary = mp.contentType.split("boundary=")[1];
            const chunks = [];
            chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="pic1"; filename="${parsed.photoName || "image.jpg"}"\r\nContent-Type: ${parsed.photoMime || "image/jpeg"}\r\n\r\n`));
            chunks.push(buf);
            chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
            const body = Buffer.concat(chunks);
            const r = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
              body,
              signal: AbortSignal.timeout(120000),
            });
            const text = await r.text();
            res.statusCode = r.status;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(text);
          } catch (e) {
            sendJson(res, 502, { error: (e && e.message) || "ok upload error" });
          }
        })();
      });

      // ── Rutube ──
      function rutubeHeaders(apiKey) {
        return { "Rutube-Api-Key": String(apiKey || "") };
      }

      server.middlewares.use("/api/rutube/me", (req, res) => {
        (async () => {
          try {
            const parsed = await readJsonBody(req);
            if (!parsed.apiKey) return sendJson(res, 400, { error: "missing apiKey" });
            const r = await fetch("https://rutube.ru/api/whoami/", {
              headers: rutubeHeaders(parsed.apiKey),
              signal: AbortSignal.timeout(30000),
            });
            const text = await r.text();
            res.statusCode = r.status;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(text);
          } catch (e) {
            sendJson(res, 502, { error: (e && e.message) || "rutube me error" });
          }
        })();
      });

      server.middlewares.use("/api/rutube/from-url", (req, res) => {
        (async () => {
          try {
            const parsed = await readJsonBody(req);
            if (!parsed.apiKey) return sendJson(res, 400, { error: "missing apiKey" });
            const r = await fetch("https://rutube.ru/api/video/from_url/", {
              method: "POST",
              headers: {
                ...rutubeHeaders(parsed.apiKey),
                "Content-Type": "application/json; charset=utf-8",
              },
              body: JSON.stringify({
                url: parsed.url,
                title: String(parsed.title || "BlogPost video").slice(0, 150),
                description: String(parsed.description || "").slice(0, 5000),
                is_private: !!parsed.isPrivate,
              }),
              signal: AbortSignal.timeout(120000),
            });
            const data = await r.json().catch(() => ({}));
            const videoId = data?.id || data?.video_id || data?.data?.id;
            sendJson(res, r.ok && videoId ? 200 : r.status || 400, {
              success: !!videoId,
              videoId: videoId != null ? String(videoId) : undefined,
              url: videoId ? `https://rutube.ru/video/${videoId}/` : undefined,
              error: !videoId ? (data?.detail || data?.error || data?.message || "Rutube from_url failed") : undefined,
              raw: data,
            });
          } catch (e) {
            sendJson(res, 502, { error: (e && e.message) || "rutube from_url error" });
          }
        })();
      });

      server.middlewares.use("/api/rutube/upload", (req, res) => {
        (async () => {
          try {
            const parsed = await readJsonBody(req);
            if (!parsed.apiKey) return sendJson(res, 400, { error: "missing apiKey" });
            const buf = b64ToBuffer(parsed.videoBase64);
            if (!buf.length) return sendJson(res, 400, { error: "empty video" });

            const boundary = "----RutubeUpload" + Math.random().toString(16).slice(2);
            const chunks = [];
            const fields = {
              title: String(parsed.title || "BlogPost video").slice(0, 150),
              description: String(parsed.description || "").slice(0, 5000),
              is_private: parsed.isPrivate ? "1" : "0",
              category: "22",
            };
            for (const [name, value] of Object.entries(fields)) {
              chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${String(value)}\r\n`));
            }
            chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="video.mp4"\r\nContent-Type: ${parsed.videoMime || "video/mp4"}\r\n\r\n`));
            chunks.push(buf);
            chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));

            const r = await fetch("https://rutube.ru/api/video/upload/", {
              method: "POST",
              headers: {
                ...rutubeHeaders(parsed.apiKey),
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
              },
              body: Buffer.concat(chunks),
              signal: AbortSignal.timeout(15 * 60 * 1000),
            });
            const data = await r.json().catch(() => ({}));
            const videoId = data?.id || data?.video_id || data?.data?.id;
            sendJson(res, r.ok && videoId ? 200 : r.status || 400, {
              success: !!videoId,
              videoId: videoId != null ? String(videoId) : undefined,
              url: videoId ? `https://rutube.ru/video/${videoId}/` : undefined,
              error: !videoId ? (data?.detail || data?.error || data?.message || "Rutube upload failed") : undefined,
              raw: data,
            });
          } catch (e) {
            sendJson(res, 502, { error: (e && e.message) || "rutube upload error" });
          }
        })();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), aiProxyPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
    proxy: {
      "/api/llm": {
        target: "https://text.pollinations.ai",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/llm/, ""),
      },
      "/api/img": {
        target: "https://image.pollinations.ai",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/img/, ""),
      },
    },
  },
});
