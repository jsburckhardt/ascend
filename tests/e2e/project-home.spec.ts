import { expect, test } from '@playwright/test'

test('shows the project home scaffold', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Ascend' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open Project' })).toBeVisible()
})
