import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// VITE_OFFLINE=1 gera um único index.html que abre com dois cliques (sem servidor).
const offline = !!process.env.VITE_OFFLINE;

export default defineConfig({
  plugins: [react(), ...(offline ? [viteSingleFile()] : [])],
  build: { target: 'es2020', cssCodeSplit: !offline },
});
