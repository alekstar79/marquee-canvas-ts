import { resolve } from 'path'
import { defineConfig } from 'vite'

/**
 * Vite configuration for library build
 * This config builds the library for npm publication
 * @see https://vitejs.dev/guide/build.html#library-mode
 */
export default defineConfig({
  build: {
    outDir: 'dist',                             // Output directory for library
    lib: {
      entry: resolve(__dirname, 'src/lib.ts'),  // Entry point
      name: 'MarqueeCanvasTS',                  // Global variable name for UMD build
      fileName: (format) => {
        // File naming based on format
        if (format === 'es') return 'marquee-canvas.mjs'
        if (format === 'umd') return 'marquee-canvas.umd.js'
        return `marquee-canvas.${format}.js`
      },
      formats: ['es', 'umd']                    // Output formats
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.[0]?.endsWith('.css')) {
            return 'marquee-canvas.css'
          }
          return '[name][extname]'
        }
      }
    },
    sourcemap: true,
    minify: 'esbuild'
  },

  publicDir: false,

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/css': resolve(__dirname, 'src/css')
    }
  },

  css: {
    modules: false, // Disable CSS modules for library
    devSourcemap: true // Sourcemaps in development
  }
})
