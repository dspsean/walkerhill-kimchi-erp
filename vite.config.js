import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: '김치하우스 OMS',
        short_name: '김치하우스',
        description: 'Kimchi House AU - 주문 관리 시스템',
        theme_color: '#1B3A2A',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        lang: 'ko',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 최대 캐시 파일 크기 증가 (xlsx가 큼)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,  // 5MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jsdelivr-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    // 🚀 성능 최적화
    target: 'es2020',              // 최신 브라우저 대상 (번들 크기 감소)
    minify: 'esbuild',             // 빠른 minify (terser보다 2배 빠름)
    cssMinify: true,               // CSS도 minify
    chunkSizeWarningLimit: 1000,   // 1MB 경고 (xlsx 때문)
    rollupOptions: {
      output: {
        // 번들 분할 (병렬 다운로드로 로드 속도 개선)
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-xlsx': ['xlsx'],          // xlsx는 별도 청크 (큼)
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  },
  // 개발 서버 최적화
  server: {
    hmr: {
      overlay: true
    }
  },
  // 의존성 사전 번들링
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', '@supabase/supabase-js', 'xlsx']
  }
});
