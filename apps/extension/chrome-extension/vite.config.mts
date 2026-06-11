import { defineConfig } from 'vite';
import { resolve } from 'path';
import libAssetsPlugin from '@laynezh/vite-plugin-lib-assets';
import makeManifestPlugin from './utils/make-manifest-plugin';
import { watchRebuildPlugin } from '@chrome-extension/hmr';

const rootDir = resolve(__dirname);
const libDir = resolve(rootDir, 'lib');

const isDev = process.env.__DEV__ === 'true';
const isProduction = !isDev;

const outDir = resolve(rootDir, '..', 'dist');
export default defineConfig({
  resolve: {
    alias: {
      '@root': rootDir,
      '@lib': libDir,
      '@assets': resolve(libDir, 'assets'),
    },
  },
  plugins: [
    libAssetsPlugin({ outputPath: outDir }),
    makeManifestPlugin({ outDir }),
    isDev && watchRebuildPlugin({ reload: true }),
  ],
  publicDir: resolve(rootDir, 'public'),
  build: {
    outDir,
    sourcemap: isDev,
    minify: isProduction,
    reportCompressedSize: isProduction,
    modulePreload: true,
    rollupOptions: {
      input: {
        'service-worker': resolve(__dirname, 'lib/background.ts'),
        injected: resolve(__dirname, 'lib/injected.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].[hash].js',
      },
      external: ['chrome'],
    },
  },
  define: {
    'process.env.NODE_ENV': isDev ? `"development"` : `"production"`,
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify(process.env.VITE_BACKEND_URL),
  },
});
