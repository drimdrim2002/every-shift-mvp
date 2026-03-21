import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const resolvedHospitalApiBaseUrl =
    env.VITE_HOSPITAL_API_BASE_URL || env.HOSPITAL_API_BASE_URL || ''
  const normalizedHospitalApiBaseUrl = resolvedHospitalApiBaseUrl.replace(/^http:\/\//, 'https://')
  const hospitalApiBaseUrl =
    normalizedHospitalApiBaseUrl ||
    'https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList'
  const hospitalApiKey = env.VITE_HOSPITAL_API_KEY || env.HOSPITAL_API_KEY || ''

  // 필수 환경 변수 체크
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
  const missing = required.filter((key) => !env[key])

  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`)
    console.warn('📝 Please copy .env.example to .env.local and fill in the values')
  }

  return {
    define: {
      'import.meta.env.VITE_HOSPITAL_API_BASE_URL': JSON.stringify(hospitalApiBaseUrl),
      'import.meta.env.VITE_HOSPITAL_API_KEY': JSON.stringify(hospitalApiKey),
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      proxy: {
        '/api': {
          target: 'https://every-shift-api-service-554455861916.asia-northeast3.run.app',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path, // /api/solve -> /api/solve (그대로 유지)
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (_proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          }
        }
      }
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      include: ['tests/unit/**/*.spec.ts']
    }
  }
})
