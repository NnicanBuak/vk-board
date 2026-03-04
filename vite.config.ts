import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow VK tunnel to proxy requests to the dev server
    allowedHosts: 'all',
    port: 5173,
  },
  build: {
    // Separate chunk for heavy VKUI icons to improve initial load
    rollupOptions: {
      output: {
        manualChunks: {
          vkui: ['@vkontakte/vkui'],
          icons: ['@vkontakte/icons'],
        },
      },
    },
  },
});
