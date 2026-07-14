import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { compression } from 'vite-plugin-compression2';
import pkg from './package.json';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
    },
    plugins: [
      tailwindcss(),
      react(),
      {
        name: 'html-version-transform',
        transformIndexHtml(html) {
          return html.replace(/__APP_VERSION__/g, pkg.version);
        },
      },
      // Compress built assets — brotli (best ratio) + gzip (broad fallback).
      // Files below 10KB are skipped (negligible savings, overhead not worth it).
      compression({
        algorithms: ['brotliCompress', 'gzip'],
        threshold: 10240,
      }),
    ],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/recharts')) return 'vendor-recharts';
            if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
            if (id.includes('node_modules/motion')) return 'vendor-motion';
            if (id.includes('node_modules/@tanstack/react-table')) return 'vendor-table';
            if (id.includes('node_modules/@dnd-kit')) return 'vendor-dnd-kit';
            if (id.includes('node_modules/lucide-react')) return 'vendor-lucide';
            if (id.includes('node_modules/@tanstack/react-virtual')) return 'vendor-virtual';
            if (id.includes('node_modules/@radix-ui')) return 'vendor-radix';
            // Heavy libs are loaded via dynamic import — isolate them into their own
            // chunks so they are never pulled into entry or feature bundles.
            if (id.includes('node_modules/exceljs')) return 'vendor-excel';
            if (id.includes('node_modules/maplibre')) return 'vendor-maplibre';
            if (id.includes('node_modules/@google/genai')) return 'vendor-genai';
            if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      css: true,
    },
  };
});
