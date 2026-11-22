import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fold-mark.svg', 'nasirpintu.jpg'],
      manifest: {
        name: 'Fold — Private PDF Workstation',
        short_name: 'Fold',
        description: '100% Client-Side, Private-by-Design PDF Toolkit. Crafted with ❤️ by NasirPintu.',
        theme_color: '#152926',
        background_color: '#152926',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'fold-mark.svg',
            sizes: '128x128 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      }
    })
  ],
  base: './',
  server: { host: '0.0.0.0', port: 3000 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdfjs-dist')) return 'vendor-pdfjs';
            if (id.includes('pdf-lib')) return 'vendor-pdflib';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('docx') || id.includes('mammoth') || id.includes('jszip')) return 'vendor-office';
            if (id.includes('tesseract.js')) return 'vendor-tesseract';
            if (id.includes('@pdfsmaller')) return 'vendor-crypto';
            if (id.includes('lucide-react')) return 'vendor-icons';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1200
  }
});

