import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Sem sourcemaps em produção e sem scripts inline (compatível com a CSP estrita do painel).
export default defineConfig({ plugins: [react()], build: { outDir: 'dist', sourcemap: false, modulePreload: { polyfill: false }, assetsInlineLimit: 0 },
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } } });
