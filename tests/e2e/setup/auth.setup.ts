import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { expect, test } from '@playwright/test'
import { getRequiredTestCredentials, login } from '../helpers'

const authFile = 'playwright/.auth/user.json'

test('authenticate via login UI', async ({ page, context }) => {
  const credentials = getRequiredTestCredentials()

  await login(page, credentials)
  await expect(page.getByRole('heading', { name: '근무표 관리', exact: true })).toBeVisible()

  mkdirSync(dirname(authFile), { recursive: true })
  await context.storageState({ path: authFile })
})
