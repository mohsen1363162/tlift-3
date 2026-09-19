import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import fs from "node:fs";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
  plugins: [
    react(),
    VitePWA({
      // روی هاست اشتراکی cPanel، Service Worker قدیمی باعث نمایش نسخه‌های منسوخ
      // می‌شد. این Worker انتقالی خودش را حذف و کش‌های PWA قبلی را پاک می‌کند؛
      // فایل‌های هش‌دار Vite همچنان توسط مرورگر بهینه کش می‌شوند.
      selfDestroying: true,
      injectRegister: false,
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
      ],
      manifest: {
        id: "/",
        name: "تلیفت همراه - آسمان سرا",
        short_name: "تلیفت همراه",
        description: "اپلیکیشن همراه تکنسین سرویس و مدیریت آسانسور شرکت آسمان سرا (emami-asemansara.ir)",
        theme_color: "#2563eb",
        background_color: "#f3f4f6",
        display: "standalone",
        orientation: "portrait",
        dir: "rtl",
        lang: "fa",
        start_url: "/?mode=mobile",
        scope: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
    {
      name: "configure-zip-headers",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (
            req.url &&
            (req.url.startsWith("/public_html.zip") ||
              req.url.startsWith("/cpanel_public_html.zip"))
          ) {
            res.setHeader("Content-Type", "application/zip");
            const filename = req.url.includes("cpanel")
              ? "cpanel_public_html.zip"
              : "public_html.zip";
            res.setHeader(
              "Content-Disposition",
              `attachment; filename="${filename}"`
            );
          }
          next();
        });
      },
    },
    {
      name: "dev-sync-api",
      // معادل توسعهٔ محلیِ public/api/sync.php تا همگام‌سازی در پیش‌نمایش کار کند
      configureServer(server) {
        const DATA_DIR = path.resolve(__dirname, ".sync-data");
        const TOKEN = "tlift-asemansara-1405";
        const fileFor = (key: unknown): string | null =>
          typeof key === "string" && /^[A-Za-z0-9_\-]{1,120}$/.test(key)
            ? path.join(DATA_DIR, key + ".json")
            : null;

        server.middlewares.use("/api/sync.php", (req, res) => {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
          );
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          if (req.method === "OPTIONS") {
            res.statusCode = 204;
            res.end();
            return;
          }

          const url = new URL(req.url || "/", "http://localhost");
          const token =
            url.searchParams.get("token") ||
            (req.headers.authorization || "").replace(/^Bearer /i, "");
          if (token !== TOKEN) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "invalid token" }));
            return;
          }
          if (!fs.existsSync(DATA_DIR))
            fs.mkdirSync(DATA_DIR, { recursive: true });

          if (req.method === "GET") {
            const key = url.searchParams.get("key") || "";
            const prefix = url.searchParams.get("prefix") || "";
            if (key) {
              const f = fileFor(key);
              if (f && fs.existsSync(f)) {
                res.end(fs.readFileSync(f, "utf8"));
              } else {
                res.end(
                  JSON.stringify({
                    key,
                    data: null,
                    updated_at: null,
                    exists: false,
                  })
                );
              }
              return;
            }
            const rows = fs
              .readdirSync(DATA_DIR)
              .filter((f) => f.endsWith(".json"))
              .map((f) => {
                const k = f.slice(0, -5);
                if (prefix && !k.startsWith(prefix)) return null;
                try {
                  return JSON.parse(
                    fs.readFileSync(path.join(DATA_DIR, f), "utf8")
                  );
                } catch {
                  return null;
                }
              })
              .filter(Boolean);
            res.end(JSON.stringify(rows));
            return;
          }

          if (req.method === "POST") {
            let body = "";
            req.on("data", (c: Buffer) => {
              body += c;
              if (body.length > 8 * 1024 * 1024) req.destroy();
            });
            req.on("end", () => {
              try {
                const obj = JSON.parse(body);
                const f = fileFor(obj.key);
                if (!f) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: "bad key" }));
                  return;
                }
                fs.writeFileSync(
                  f,
                  JSON.stringify({
                    key: obj.key,
                    data: obj.data ?? null,
                    updated_at: obj.updated_at || new Date().toISOString(),
                  })
                );
                res.end(JSON.stringify({ ok: true, key: obj.key }));
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "bad request" }));
              }
            });
            return;
          }

          res.statusCode = 405;
          res.end(JSON.stringify({ error: "method not allowed" }));
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
