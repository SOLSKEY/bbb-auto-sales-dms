import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const preferredPort = Number(env.PORT ?? env.VITE_PORT ?? 3000);
    const preferredHost = env.VITE_HOST ?? '0.0.0.0';
    return {
      server: {
        port: Number.isFinite(preferredPort) ? preferredPort : 3000,
        host: preferredHost,
        allowedHosts: [
          '.ngrok.io',
          '.ngrok-free.app',
          '.ngrok.app',
        ],
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
      },
      build: {
        chunkSizeWarningLimit: 1500,
      },
    };
});
