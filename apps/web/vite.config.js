import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
  const skyServerApiOrigin =
    loadEnv(mode, repoRoot, '').VITE_SKYSERVER_API_ORIGIN || 'http://localhost:7171';

  return {
    root: fileURLToPath(new URL('.', import.meta.url)),
    envDir: repoRoot,
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': {
          target: skyServerApiOrigin,
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
