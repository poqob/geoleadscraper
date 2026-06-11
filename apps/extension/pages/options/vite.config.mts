import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import { watchRebuildPlugin } from '@chrome-extension/hmr';

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, 'src');

const isDev = process.env.__DEV__ === 'true';
const isProduction = !isDev;

export default defineConfig({
  resolve: {
    alias: {
      '@src': srcDir,
    },
  },
  base: '',
  plugins: [react(), isDev && watchRebuildPlugin({ refresh: true })],
  publicDir: resolve(rootDir, 'public'),
  build: {
    outDir: resolve(rootDir, '..', '..', 'dist', 'options'),
    sourcemap: isDev,
    minify: isProduction,
    reportCompressedSize: isProduction,
    rollupOptions: {
      external: ['chrome'],
    },
  },
  define: {
    'process.env.NODE_ENV': isDev ? `"development"` : `"production"`,
    'import.meta.env.API_HOST': JSON.stringify(process.env.API_HOST),
    'import.meta.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID),
  },
});
