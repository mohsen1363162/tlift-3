import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

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
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
