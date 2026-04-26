import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'

const checkEnvScriptPath = resolve(process.cwd(), 'scripts/check-env.js')
const tempDirectories: string[] = []

function createTempProject() {
  const directory = join(tmpdir(), `everyshift-check-env-${randomUUID()}`)
  mkdirSync(directory, { recursive: true })
  tempDirectories.push(directory)
  return directory
}

function writeLocalEnv(directory: string, envText: string) {
  writeFileSync(join(directory, '.env.local'), envText)
}

function runCheckEnv(cwd: string) {
  return spawnSync(process.execPath, [checkEnvScriptPath], {
    cwd,
    encoding: 'utf8',
  })
}

describe('check-env script', () => {
  afterEach(() => {
    for (const directory of tempDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true })
    }
  })

  it('fails when .env.local is missing', () => {
    const cwd = createTempProject()

    const result = runCheckEnv(cwd)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('.env.local')
  })

  it('fails when VITE_PUBLIC_INQUIRY_FORM_URL is missing', () => {
    const cwd = createTempProject()
    writeLocalEnv(
      cwd,
      [
        'VITE_SUPABASE_URL=https://example.supabase.co',
        'VITE_SUPABASE_ANON_KEY=anon-key',
      ].join('\n'),
    )

    const result = runCheckEnv(cwd)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('VITE_PUBLIC_INQUIRY_FORM_URL')
  })

  it('fails when VITE_PUBLIC_INQUIRY_FORM_URL is not a valid URL', () => {
    const cwd = createTempProject()
    writeLocalEnv(cwd, 'VITE_PUBLIC_INQUIRY_FORM_URL=not-a-url')

    const result = runCheckEnv(cwd)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('http 또는 https')
  })

  it('fails when VITE_PUBLIC_INQUIRY_FORM_URL is not a Google Form URL', () => {
    const cwd = createTempProject()
    writeLocalEnv(cwd, 'VITE_PUBLIC_INQUIRY_FORM_URL=https://example.com/inquiry')

    const result = runCheckEnv(cwd)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Google Form')
  })

  it('fails when VITE_PUBLIC_INQUIRY_FORM_URL still uses the template placeholder', () => {
    const cwd = createTempProject()
    writeLocalEnv(cwd, 'VITE_PUBLIC_INQUIRY_FORM_URL=https://forms.gle/YOUR_PUBLIC_INQUIRY_FORM_ID')

    const result = runCheckEnv(cwd)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('실제 Google Form URL')
  })

  it('passes for a docs.google.com/forms URL', () => {
    const cwd = createTempProject()
    writeLocalEnv(cwd, 'VITE_PUBLIC_INQUIRY_FORM_URL=https://docs.google.com/forms/d/e/demo/viewform')

    const result = runCheckEnv(cwd)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('VITE_PUBLIC_INQUIRY_FORM_URL')
  })

  it('passes for a forms.gle URL', () => {
    const cwd = createTempProject()
    writeLocalEnv(cwd, 'VITE_PUBLIC_INQUIRY_FORM_URL=https://forms.gle/everyshift')

    const result = runCheckEnv(cwd)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('VITE_PUBLIC_INQUIRY_FORM_URL')
  })
})
