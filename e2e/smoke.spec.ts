import { expect, test } from '@playwright/test'
test('app loads without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.locator('#root')).not.toBeEmpty()
  expect(errors).toEqual([])
})