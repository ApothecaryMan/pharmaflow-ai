import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
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
        }
      }
    ],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      chunkSizeWarningLimit: 1200,
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
            if (id.includes('node_modules/radix-ui')) return 'vendor-radix';
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
