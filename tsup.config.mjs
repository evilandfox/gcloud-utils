import libConfig from '@shveitsar/configs/tsup.lib.mjs'
import { defineConfig } from 'tsup'

export default defineConfig({
  ...libConfig,
  entry: ['src/*/index.ts', 'src/index.ts']
})
