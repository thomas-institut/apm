import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        setupFiles: ['test/js/setup/webLocks.polyfill.ts'],
      alias: {
        // @ts-ignore
        '@/': new URL('./js/', import.meta.url).pathname,
      }
    }
})
