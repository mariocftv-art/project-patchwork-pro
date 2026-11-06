import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";

// Versão do site: muda a cada publicação (horário de São Paulo)
const BUILD_ID = String(Date.now());
const BUILD_LABEL = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "");
const versionFile = () => ({
  name: "version-json",
  apply: "build" as const,
  writeBundle(opts: { dir?: string }) {
    fs.writeFileSync(path.join(opts.dir || "dist", "version.json"), JSON.stringify({ id: BUILD_ID, label: BUILD_LABEL }));
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
    __APP_BUILD_LABEL__: JSON.stringify(BUILD_LABEL),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    versionFile(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png", "pwa-maskable-512x512.png"],
      manifest: {
        name: "MR Segurança Máxima",
        short_name: "MR Segurança",
        description: "CNPJ: 45.858.215/0001-86 - Loja de equipamentos de segurança: câmeras, DVR, cercas elétricas e automação",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        shortcuts: [
          { name: "Painel Administrativo", short_name: "Painel", url: "/admin", icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }] },
          { name: "Novo Orçamento", short_name: "Orçamento", url: "/admin/orcamentos/novo", icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }] },
          { name: "Agendamentos", short_name: "Agenda", url: "/admin/agendamentos", icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }] },
        ],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // HTML nunca fica guardado: a página sempre vem nova da internet
        globPatterns: ["**/*.{js,css,ico,png,svg,jpg,jpeg,webp}"],
        navigateFallback: null,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globIgnores: ["**/pdf.worker*", "**/b*-tall-*.jpg", "**/b*-wide-*.jpg"],
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: { cacheName: "pages", networkTimeoutSeconds: 4, expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 } },
          },
          {
            urlPattern: /\/version\.json/,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return "react";
          if (id.includes("node_modules/@supabase/")) return "supabase";
          if (id.includes("node_modules/@tanstack/")) return "query";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
