import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '127.0.0.1',
        strictPort: true,
      },
      plugins: [
        react(),
        VitePWA({
          // Tauri desktop apps don't need a Service Worker and it can cause
          // confusing blank-screen failures if caching/pathing goes wrong.
          // We'll register SW manually for web-only in index.tsx.
          injectRegister: null,
          registerType: 'autoUpdate',
          includeAssets: ['favicon.svg'],
          manifest: {
            name: 'HabitFlow',
            short_name: 'HabitFlow',
            start_url: './',
            display: 'standalone',
          },
          workbox: {
            navigateFallback: './index.html',
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;

              if (id.includes('react-dom') || id.includes('react')) {
                return 'react-vendor';
              }

              if (id.includes('recharts') || id.includes('/d3-')) {
                return 'charts';
              }

              if (id.includes('lucide-react')) {
                return 'icons';
              }

              if (id.includes('date-fns')) {
                return 'date';
              }

              return 'vendor';
            },
          },
        },
      },
    };
});
