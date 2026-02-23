import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import swVersionPlugin from './src/plugins/sw-version.js'
import firebaseSwPlugin from './src/plugins/firebase-sw-plugin.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // NOTE: VitePWA has been removed intentionally.
    // It was generating its own Workbox SW that overwrote our manual sw.js,
    // causing stale cache issues. The manifest is served from public/manifest.json
    // and our sw.js handles caching with a network-first strategy.
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // Only compress files > 10KB
      algorithm: 'gzip',
      ext: '.gz'
    }),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: './dist/stats.html'
    }),
    swVersionPlugin(),
    firebaseSwPlugin()
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion'],
          'utils': ['axios']
        },
        // Asset naming with content hash
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Enable asset inlining for small files
    assetsInlineLimit: 4096 // 4KB
  },
  preview: {
    port: 3000,
    host: '0.0.0.0'
  }
})