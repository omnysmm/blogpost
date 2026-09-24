import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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

            const payload = {
              model: "openai",
              messages: [
                { role: "system", content: system },
                {
                  role: "user",
                  content:
                    language === "ru"
                      ? `${prompt}`
                      : `${prompt}`,
                },
              ],
              max_tokens: 1200,
              temperature: 0.7,
            };

            const upstreams = [
              { url: "https://text.pollinations.ai/openai", body: payload },
              {
                url: "https://text.pollinations.ai/openai",
                body: { ...payload, model: "openai-fast" },
              },
            ];

            let lastErr = "";
            for (const up of upstreams) {
              try {
                const r = await fetch(up.url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Accept: "application/json" },
                  body: JSON.stringify(up.body),
                  signal: AbortSignal.timeout(120000),
                });
                const raw = await r.text();
                if (!r.ok) {
                  lastErr = "upstream " + r.status + " " + raw.slice(0, 200);
                  continue;
                }
                let text = "";
                try {
                  const data = JSON.parse(raw);
                  text =
                    (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
                    (data && data.choices && data.choices[0] && data.choices[0].text) ||
                    (data && data.text) ||
                    "";
                } catch (e) {
                  text = raw;
                }
                text = String(text).replace(/^[\s\S]*?<\/think>/i, "").trim();
                if (text.length > 20) {
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json; charset=utf-8");
                  res.end(JSON.stringify({ text }));
                  return;
                }
                lastErr = "empty text";
              } catch (e) {
                lastErr = (e && e.message) || "proxy error";
              }
            }

            // Last resort: simple GET text API
            try {
              const simple = `https://text.pollinations.ai/${encodeURIComponent(String(body.prompt || "Write a short post.").slice(0, 1500))}`;
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
              lastErr = lastErr || "simple api empty";
            } catch (e) {
              lastErr = (e && e.message) || lastErr || "simple api error";
            }

            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: lastErr || "upstream failed" }));
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
      server.middlewares.use("/api/telegram", (req, res) => {
        const q = req.url || "";
        const method = q.replace(/^\/+/, "").split("?")[0] || "sendMessage";
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
            const headers = {};
            if (contentType) headers["Content-Type"] = contentType;

            // JSON + photoBase64 → rebuild multipart for Telegram (reliable photo upload)
            let body = raw;
            if (contentType.includes("application/json") && raw.length) {
              try {
                const parsed = JSON.parse(raw.toString("utf8"));
                if (!parsed.token) parsed.token = token;
                const photoBase64 = parsed.photoBase64;
                if (photoBase64) {
                  const mime = parsed.photoMime || "image/jpeg";
                  const name = parsed.photoName || "image.jpg";
                  const buf = Buffer.from(photoBase64, "base64");
                  const FormData = globalThis.FormData;
                  const Blob = globalThis.Blob;
                  const form = new FormData();
                  form.append("chat_id", String(parsed.chat_id ?? parsed.chatId ?? ""));
                  form.append("caption", String(parsed.caption ?? ""));
                  form.append("parse_mode", String(parsed.parse_mode || "HTML"));
                  form.append("photo", new Blob([buf], { type: mime }), name);
                  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
                    method: "POST",
                    body: form,
                    signal: AbortSignal.timeout(120000),
                  });
                  const text = await r.text();
                  res.statusCode = r.status;
                  res.setHeader("Content-Type", "application/json; charset=utf-8");
                  res.end(text);
                  return;
                }
                delete parsed.photoBase64;
                delete parsed.photoMime;
                delete parsed.photoName;
                if (method === "sendPhoto" && parsed.photo && !String(parsed.photo).startsWith("http")) {
                  // data URL in photo field
                  const dataUrl = String(parsed.photo);
                  const comma = dataUrl.indexOf(",");
                  if (comma > 0) {
                    const meta = dataUrl.slice(5, comma);
                    const mime = (meta.split(";")[0] || "image/jpeg");
                    const buf = Buffer.from(dataUrl.slice(comma + 1).replace(/\s/g, ""), meta.includes("base64") ? "base64" : "utf8");
                    const form = new FormData();
                    form.append("chat_id", String(parsed.chat_id ?? ""));
                    form.append("caption", String(parsed.caption ?? ""));
                    form.append("parse_mode", String(parsed.parse_mode || "HTML"));
                    form.append("photo", new Blob([buf], { type: mime }), "image.jpg");
                    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
                      method: "POST",
                      body: form,
                      signal: AbortSignal.timeout(120000),
                    });
                    const text = await r.text();
                    res.statusCode = r.status;
                    res.setHeader("Content-Type", "application/json; charset=utf-8");
                    res.end(text);
                    return;
                  }
                }
                body = Buffer.from(JSON.stringify(parsed), "utf8");
              } catch {}
            }

            const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
              method: "POST",
              headers,
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
