export default {
    test: {
        setupFiles: ['test/js/setup/webLocks.polyfill.ts'],
      alias: {
        // @ts-ignore
        '@/': new URL('./js/', import.meta.url).pathname,
      }
    }
}
