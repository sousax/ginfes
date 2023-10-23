import { defineConfig } from 'tsup'

export default defineConfig({
  bundle: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ['esm'],
  dts: true,
  entryPoints: ['src/index.ts'],
})
