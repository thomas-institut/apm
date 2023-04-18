// vite.config.js
import {defineConfig} from "vite";
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        port: 6888
    },
    build: {
        manifest: true,
        minify: true,
        rollupOptions: {
            input: './index.html',
        },
    },
})