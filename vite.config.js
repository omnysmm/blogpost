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
                      ? `${prompt}\n\nГотовый текст строго по теме.`
                      : `${prompt}\n\nReady content strictly on topic.`,
                },
              ],
              max_tokens: 1200,
              temperature: 0.7,
            };

            const r = await fetch("https://text.pollinations.ai/openai", {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(120000),
            });
            const raw = await r.text();
            if (!r.ok) {
              res.statusCode = 502;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "upstream " + r.status, detail: raw.slice(0, 300) }));
              return;
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
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ text }));
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
