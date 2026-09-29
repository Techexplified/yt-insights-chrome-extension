import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// specialized config for content script to ensure it's a single file IIFE
export default defineConfig({
    plugins: [react()],
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
        emptyOutDir: false, // Don't wipe the dist folder from the main build
        outDir: 'dist',
        lib: {
            entry: resolve(__dirname, 'src/content/content.ts'),
            name: 'ContentScript',
            formats: ['iife'],
            fileName: () => 'content.js'
        },
        rollupOptions: {
            output: {
                // Ensure global variables for React don't conflict
                extend: true,
            }
        }
    },
})
