import { expect, type Page, type TestInfo } from '@playwright/test';

export async function openApp(page: Page, info: TestInfo, route = '') {
  await page.goto(`${info.project.metadata.appUrl}${route}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

export async function addVehicle(
  page: Page,
  {
    description = 'Daily driver',
    year = '2020',
    make = 'Toyota',
    model = 'Camry',
    mileage = '45000',
  } = {},
) {
  await page.goto(`${page.url().split('#')[0]}#/vehicles/new`);
  await page.getByLabel('Description').fill(description);
  await page.getByLabel('Year').selectOption(year);
  await page.getByLabel('Make', { exact: true }).selectOption(make);
  await page.getByLabel('Model', { exact: true }).selectOption(model);
  await page.getByLabel('Mileage').fill(mileage);
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await expect(page.getByRole('heading', { name: description })).toBeVisible();
}
