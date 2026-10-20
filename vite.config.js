import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
