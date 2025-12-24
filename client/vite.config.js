import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Include specific polyfills needed by simple-peer
      include: ['events', 'util', 'buffer', 'process', 'stream'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
})
