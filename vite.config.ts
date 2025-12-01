import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Ensure no source maps in production for security
    sourcemap: false,
    // Optimize for production
    minify: 'esbuild',
  },
  // Security: Disable any server-side features
  server: {
    // No logging
    logger: {
      warn: () => {},
      error: () => {},
    },
  },
})

