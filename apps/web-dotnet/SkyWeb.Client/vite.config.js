import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const clientRoot = fileURLToPath(new URL('.', import.meta.url));
  const env = loadEnv(mode, clientRoot, '');
  const skyWebApiOrigin = env.VITE_SKYWEB_API_ORIGIN || 'http://localhost:7280';

  return {
    root: fileURLToPath(new URL('.', import.meta.url)),
    envDir: clientRoot,
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': {
          target: skyWebApiOrigin,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
