import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Disable module preload polyfill as it can cause issues in extensions
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        // Ensure filenames match manifest.json (no hashes for extension scripts)
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js'
          }
          if (chunkInfo.name === 'content') {
            return 'content.js'
          }
          return '[name].js'
        },
        // Force dependencies into the entry chunks to prevent code splitting for content scripts
        manualChunks: undefined,
      },
      // Important: Ensure we don't accidentally split common deps
      preserveEntrySignatures: 'strict',
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})
