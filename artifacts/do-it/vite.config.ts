import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'], // <-- CAMBIADO
      workbox: {
        navigateFallbackDenylist: [/^\/api/, /^\/sitemap\.xml/, /^\/robots\.txt/],
        importScripts: ['/push-sw.js'],
        maximumFileSizeToCacheInBytes: 5000000 
      },
      manifest: {
        name: 'do it!',
        short_name: 'do it!',
        description: 'Productividad minimalista',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'favicon.png', sizes: '192x192', type: 'image/png' }, // <-- CAMBIADO
          { src: 'favicon.png', sizes: '512x512', type: 'image/png' }, // <-- CAMBIADO
          { src: 'favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' } // <-- CAMBIADO
        ]
      }
    }),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer({ root: path.resolve(import.meta.dirname, "..") })),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: { outDir: path.resolve(import.meta.dirname, "dist/public"), emptyOutDir: true },
  server: { port, strictPort: true, host: "0.0.0.0", allowedHosts: true, fs: { strict: true }, proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true, secure: false } } },
  preview: { port, host: "0.0.0.0", allowedHosts: true },
});