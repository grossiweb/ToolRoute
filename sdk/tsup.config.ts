import { defineConfig } from 'tsup'

export default defineConfig([
  // Library — ESM + CJS + types
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
  },
  // CLI — CJS only, with shebang for npx
  {
    entry: { cli: 'src/cli.ts' },
    format: ['cjs'],
    banner: { js: '#!/usr/bin/env node\n' },
    dts: false,
  },
])
