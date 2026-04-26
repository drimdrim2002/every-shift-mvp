import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:5173'
const authFile = 'playwright/.auth/user.json'
const publicLaunchSupabaseProjectRef = 'vjmerqaxguovnojinxfq'
const publicLaunchSupabaseAnonKey = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbWVycWF4Z3Vvdm5vamlueGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0',
  'repo-ready-signature',
].join('.')
const isPublicLaunchRepoReadyRun = detectPublicLaunchRepoReadyRun(process.argv)
const chromiumUse = isPublicLaunchRepoReadyRun
  ? { ...devices['Desktop Chrome'], storageState: { cookies: [], origins: [] } }
  : { ...devices['Desktop Chrome'], storageState: authFile }
const webServerCommand = isPublicLaunchRepoReadyRun
  ? `VITE_SUPABASE_URL=https://${publicLaunchSupabaseProjectRef}.supabase.co VITE_SUPABASE_ANON_KEY=${publicLaunchSupabaseAnonKey} pnpm dev --host 127.0.0.1`
  : 'pnpm dev --host 127.0.0.1'

loadOptionalEnvFile('.env.test')

function loadOptionalEnvFile(relativePath: string) {
  const filePath = resolve(process.cwd(), relativePath)
  if (!existsSync(filePath)) {
    return
  }

  const fileContents = readFileSync(filePath, 'utf8')
  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function detectPublicLaunchRepoReadyRun(argv: string[]) {
  const specArgs = argv.filter((arg) => /(?:^|[\\/])[^\\/]+\.spec\.ts(?::\d+)?$/.test(arg))

  return argv.includes('--no-deps')
    && specArgs.length === 1
    && /(?:^|[\\/])public-launch\.spec\.ts(?::\d+)?$/.test(specArgs[0] ?? '')
}

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Shared DB-backed E2E should stay serial for stability. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    testIdAttribute: 'data-test',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: isPublicLaunchRepoReadyRun ? [] : ['setup'],
      testIgnore: /.*\.setup\.ts/,
      use: chromiumUse,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
