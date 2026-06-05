import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

// Library mode: emit a single ESM bundle + a rolled-up .d.ts, with React /
// React-DOM / d3 / lucide-react externalized so the consumer's own copies are
// used. cssCodeSplit:false bundles every CSS module + global into one
// dist/style.css that the consumer imports once.
export default defineConfig({
  plugins: [react(), dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'd3', 'lucide-react'],
    },
  },
});
