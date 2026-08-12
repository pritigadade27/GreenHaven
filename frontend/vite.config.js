import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // Listen on every interface, not just IPv6 loopback. The default bound only
    // [::1], so http://127.0.0.1:5173 refused to connect while localhost worked,
    // and the site was unreachable from a phone on the same network.
    host: true,
    // Spring Boot runs on 8080; calling /api/... from React avoids CORS in dev.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Uploaded product photographs are served by Spring, not Vite.
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * React and the router in their own chunk.
         *
         * They change when a dependency is upgraded, which is rarely; the app
         * code changes constantly. Split apart, a returning visitor
         * re-downloads only what actually changed instead of the whole entry
         * bundle every deploy.
         */
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
