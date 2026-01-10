import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      // Pre-bundle some problematic deps to avoid runtime load-order issues
      optimizeDeps: {
        include: ['lucide-react', 'lottie-web']
      },
      ssr: {
        noExternal: ['lucide-react']
      },
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
        // Use Vite/Rollup defaults to avoid splitting lucide-react incorrectly
      },
    };
});
