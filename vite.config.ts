import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
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
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}"],
        globIgnores: ["**/pdf.worker*", "**/b*-tall-*.jpg", "**/b*-wide-*.jpg"],
        runtimeCaching: [
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
          if (/node_modules\/(jspdf|jspdf-autotable|html2canvas|canvg|dompurify|fflate)\//.test(id) || id.includes("/src/lib/premiumPDF")) return "pdf";
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
