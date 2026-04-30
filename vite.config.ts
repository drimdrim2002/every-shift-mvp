/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import type { ProxyOptions } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const solverApiTarget = (env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '')
  const solverProxyConfig: Record<string, ProxyOptions> | undefined = solverApiTarget
    ? {
        '/api': {
          target: solverApiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('proxy error', err)
            })
            proxy.on('proxyReq', (_proxyReq, req) => {
              console.log('Sending Request to the Target:', req.method, req.url)
            })
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url)
            })
          }
        },
        '/solve': {
          target: solverApiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path,
        },
        '/status': {
          target: solverApiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path,
        }
      }
    : undefined

  // 필수 환경 변수 체크
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
  const missing = required.filter((key) => !env[key])

  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`)
    console.warn('📝 Please copy .env.example to .env.local and fill in the values')
  }

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: solverProxyConfig ? { proxy: solverProxyConfig } : {},
    test: {
      globals: true,
      environment: 'happy-dom',
      include: ['tests/unit/**/*.spec.ts']
    }
  }
})
