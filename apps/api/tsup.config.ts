import { resolve } from 'node:path';
import { defineConfig } from 'tsup';

const src = resolve(import.meta.dirname, 'src');

export default defineConfig({
  entry: ['src/server.ts', 'src/vercel.ts'],
  format: ['esm'],
  target: 'es2022',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  noExternal: ['@repo/contracts'],
  esbuildOptions(options) {
    options.alias = {
      '@': src
    };
  }
});
