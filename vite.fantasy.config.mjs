import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    outDir: 'web/js/fantasy-automation/runtime',
    emptyOutDir: true,
    lib: { entry: 'web/js/fantasy-automation/app.ts', formats: ['es'], fileName: () => 'app.js' },
    rollupOptions: { external: ['three'] },
    target: 'es2022',
    sourcemap: false,
  },
});
