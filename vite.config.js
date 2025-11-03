import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// Base path pour GitHub Pages vs Vercel
// Par défaut, utiliser '/' pour Vercel/Netlify
// Pour GitHub Pages, définir VITE_BASE_PATH=/Doogoo/ dans les variables d'environnement
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['robots.txt'],
      // Ne pas inclure favicon.ico automatiquement (utilise les icônes PNG)
      manifest: {
        filename: 'manifest.webmanifest',
        name: 'Doogoo - Smart Property Monitoring & Analytics',
        short_name: 'Doogoo',
        description: 'Smart Property Monitoring & Analytics Platform with real-time tracking',
        theme_color: '#22c55e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          {
            src: `${base}icons/icon-72x72.png`,
            sizes: '72x72',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: `${base}icons/icon-96x96.png`,
            sizes: '96x96',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: `${base}icons/icon-128x128.png`,
            sizes: '128x128',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: `${base}icons/icon-144x144.png`,
            sizes: '144x144',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: `${base}icons/icon-152x152.png`,
            sizes: '152x152',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: `${base}icons/icon-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: `${base}icons/icon-384x384.png`,
            sizes: '384x384',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: `${base}icons/icon-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Stratégie de cache par défaut pour les assets statiques
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 heures
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 jours
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Désactivé en dev pour éviter les problèmes
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild', // Utilise esbuild au lieu de terser (plus rapide, inclus par défaut)
    cssCodeSplit: true, // Split CSS pour améliorer le cache
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          apexcharts: ['vue3-apexcharts', 'apexcharts'],
          supabase: ['@supabase/supabase-js']
        },
        // Optimise les noms de fichiers pour le cache
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: assetInfo => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    // Augmente la limite de taille pour les warnings (ApexCharts peut être volumineux)
    chunkSizeWarningLimit: 1000
  },
  // Optimisations pour la production
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia'],
    exclude: ['vue3-apexcharts'] // Chargé dynamiquement
  }
})
