import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
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
