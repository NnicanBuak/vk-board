import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: "Collabo - Board",
        short_name: "Collabo",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [],
      },
    }),
  ],
  server: {
    // Allow VK tunnel to proxy requests to the dev server
    allowedHosts: true,
    port: 5173,
  },
  build: {
    // Separate chunk for heavy VKUI icons to improve initial load
    rollupOptions: {
      output: {
        manualChunks: {
          vkui: ["@vkontakte/vkui"],
          icons: ["@vkontakte/icons"],
        },
      },
    },
  },
});
