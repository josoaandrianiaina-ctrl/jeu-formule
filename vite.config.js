import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 4000 },
  test: { environment: 'node', testTimeout: 120000 },
});
