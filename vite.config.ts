import { extname, resolve } from 'path'
import { defineConfig } from 'vite'

/**
 * Vite configuration
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  // Development server configuration
  server: {
    port: 3000,          // Port for development server
    open: true,          // Automatically open browser
    host: true           // Listen on all addresses
  },

  // Build configuration for production
  build: {
    outDir: resolve(__dirname, 'example'),
    target: 'esnext',    // Target modern browsers
    minify: 'esbuild',   // Use esbuild for minification (fast)
    sourcemap: true,     // Generate source maps for debugging
    rollupOptions: {
      output: {
        entryFileNames: 'js/marquee.js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: (assetInfo) => {
          if (!assetInfo.names?.[0]) return ''

          const extType = extname(assetInfo.names[0])

          // CSS files in the 'css' folder
          if (extType === '.css') {
            return 'assets/css/[name][extname]'
          }

          // Fonts in the 'fonts' folder
          if (extType === '.woff' || extType === '.woff2' || extType === '.ttf') {
            return 'assets/fonts/[name][extname]'
          }

          // Images to the 'images' folder
          if (['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'].includes(extType)) {
            return 'assets/images/[name][extname]'
          }

          // Other files in 'assets'
          return 'assets/[name][extname]'
        }
      }
    }
  },

  // Public asset directory
  publicDir: 'public',

  // Path resolution configuration
  resolve: {
    alias: {
      // Create aliases for common paths to avoid relative path confusion
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/css': resolve(__dirname, 'src/css')
    }
  }
})
