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
        // Ensure pdf-lib can be resolved during build
        dedupe: ['pdf-lib'],
      },
      build: {
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
          // Externalize pdf-lib as suggested by the error message
          // It will be loaded dynamically at runtime via import()
          external: (id) => {
            // Don't externalize - we need it bundled for browser
            // The issue is that Rollup tries to resolve it during static analysis
            // even though it's a dynamic import. We'll handle this differently.
            return false;
          },
          output: {
            // Ensure dynamic imports create separate chunks
            inlineDynamicImports: false,
          },
        },
        // Ensure commonjs dependencies are handled
        commonjsOptions: {
          include: [/pdf-lib/, /node_modules/],
        },
      },
      optimizeDeps: {
        exclude: ['pdf-lib'], // Don't pre-bundle pdf-lib
      },
    };
});
