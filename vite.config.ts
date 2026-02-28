import { defineConfig } from 'vite'
import wasm from 'vite-plugin-wasm'


export default defineConfig({
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['multithreadoutput11.js']
  },
  build: {
    rollupOptions: {
      external: ['multithreadoutput11.js']
    }
  },
  server: {
    port: 5173,
    headers: {
      // Required for Emscripten pthreads in the browser
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  plugins: [wasm()],
});
