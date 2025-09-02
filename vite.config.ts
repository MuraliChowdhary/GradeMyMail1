/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  
  return {
  plugins: [
    react(),
    
    // Bundle analyzer - generates stats.html
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
    
    // PWA plugin for service worker
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
        skipWaiting: isProduction,
        clientsClaim: isProduction,
      },
      manifest: {
        name: 'GradeMyMail - Email Analysis System',
        short_name: 'GradeMyMail',
        description: 'AI-powered email analysis and improvement tool',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@components': fileURLToPath(
        new URL('./src/components', import.meta.url)
      ),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
      '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
    },
  },
  // Environment-specific configuration
  define: {
    __DEV__: !isProduction,
    __PROD__: isProduction,
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:3001'),
    'process.env.VITE_CDN_URL': JSON.stringify(env.VITE_CDN_URL || ''),
  },
  
  build: {
    // Production-specific build options
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    
    // Advanced code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunk for React and core libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('axios') || id.includes('zustand')) {
              return 'utils-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            if (id.includes('lexical') || id.includes('@lexical')) {
              return 'editor-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            // Group other vendor libraries
            return 'vendor';
          }
          
          // Component-based chunks
          if (id.includes('/components/')) {
            if (id.includes('RichTextEditor')) {
              return 'rich-text-editor';
            }
            if (id.includes('VirtualizedDiff')) {
              return 'virtualized-diff';
            }
            if (id.includes('LoadingScreen')) {
              return 'loading-components';
            }
            if (id.includes('ErrorDisplay') || id.includes('ErrorBoundary')) {
              return 'error-components';
            }
            return 'ui-components';
          }
          
          // Utility chunks
          if (id.includes('/utils/')) {
            if (id.includes('performance') || id.includes('webVitals')) {
              return 'performance-utils';
            }
            if (id.includes('highlighting') || id.includes('diffEngine')) {
              return 'analysis-utils';
            }
            return 'utils';
          }
          
          // Service chunks
          if (id.includes('/services/')) {
            return 'services';
          }
          
          // Hook chunks
          if (id.includes('/hooks/')) {
            return 'hooks';
          }
        },
        // Optimize chunk naming for better caching
        chunkFileNames: () => {
          return `assets/[name]-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return `assets/[name]-[hash].[ext]`;
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash].[ext]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash].[ext]`;
          }
          return `assets/[name]-[hash].[ext]`;
        },
      },
      // External dependencies for CDN
      external: isProduction && env.VITE_CDN_URL ? [
        // Externalize large libraries for CDN loading
        // 'react',
        // 'react-dom',
      ] : [],
    },
    
    // Production optimizations
    sourcemap: isProduction ? 'hidden' : true, // Hidden source maps in production
    chunkSizeWarningLimit: 500,
    minify: isProduction ? 'terser' : false,
    terserOptions: isProduction ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        safari10: true,
        properties: {
          regex: /^_/, // Mangle private properties
        },
      },
      format: {
        comments: false, // Remove comments
      },
    } : undefined,
    
    // Target modern browsers for better optimization
    target: isProduction ? ['es2020', 'chrome80', 'firefox78', 'safari14'] : 'es2020',
    
    // CSS optimization
    cssCodeSplit: true,
    cssMinify: isProduction,
    
    // Asset optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
    
    // Report compressed file sizes
    reportCompressedSize: isProduction,
    
    // Write bundle info
    write: true,
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@tanstack/react-query', 
      'axios', 
      'zustand',
      'framer-motion',
      'react-router-dom',
      'web-vitals'
    ],
    exclude: [
      // Exclude large libraries that should be loaded on demand
      'lexical',
      '@lexical/react',
      '@lexical/html',
      'react-window'
    ],
  },
  // Enable experimental features for better performance
  esbuild: {
    // Tree shaking for better bundle size
    treeShaking: true,
    // Remove unused imports
    ignoreAnnotations: false,
    // Target modern browsers
    target: 'es2020',
  },
  // Server configuration
  server: {
    port: 5173,
    host: true,
    cors: true,
    // Production preview server settings
    ...(isProduction && {
      headers: {
        'Cache-Control': 'public, max-age=31536000',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      },
    }),
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
    host: true,
    cors: true,
    headers: {
      'Cache-Control': 'public, max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  },
  
  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: true,
  },
  };
});
