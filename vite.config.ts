import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api/log': {
          target: 'http://localhost:3003',
          changeOrigin: true,
        },
        '/api/vehicle-positions': {
          target: 'https://ttcmapsapi-ewacfyffhjffhces.canadacentral-01.azurewebsites.net',
          changeOrigin: true,
        },
        '/api': {
          target: 'https://bustime.ttc.ca',
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api/, '/api/v3'),
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
