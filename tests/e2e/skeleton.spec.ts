import { expect, test } from '@playwright/test';

test('renders and persists across reload', async ({ page }, testInfo) => {
  await page.goto(testInfo.project.metadata.appUrl);
  await page.getByRole('button', { name: 'Count: 0' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Count: 1' })).toBeVisible();
});
