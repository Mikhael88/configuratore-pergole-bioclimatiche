import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api/typesafe': {
        target: 'https://api.typesafe.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/typesafe/, ''),
        headers: {
          Origin: 'https://api.typesafe.ai',
        },
      },
    },
  },
  preview: {
    port: 5174,
    proxy: {
      '/api/typesafe': {
        target: 'https://api.typesafe.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/typesafe/, ''),
        headers: {
          Origin: 'https://api.typesafe.ai',
        },
      },
    },
  },
  build: {
    target: 'es2022',
  },
});