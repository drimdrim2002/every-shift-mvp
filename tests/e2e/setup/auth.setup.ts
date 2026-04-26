import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { expect, test } from '@playwright/test'
import { getRequiredTestCredentials, login, waitForAuthenticatedLanding } from '../helpers'

const authFile = 'playwright/.auth/user.json'

test('authenticate via login UI', async ({ page, context }) => {
  const credentials = getRequiredTestCredentials()

  await login(page, credentials)
  await waitForAuthenticatedLanding(page)
  await expect(page).not.toHaveURL(/\/login$/)

  mkdirSync(dirname(authFile), { recursive: true })
  await context.storageState({ path: authFile })
})
