import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Keep `/assets` for legacy static pages and emit Vite bundles under `/spa`
    assetsDir: 'spa',
  },
  server: {
    host: '0.0.0.0', // listen on all interfaces so your phone can connect
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
   /*   '/assets': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    */},
  },
});