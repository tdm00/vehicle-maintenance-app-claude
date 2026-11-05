import { expect, type Page, test } from '@playwright/test';
import { addVehicle, openApp } from './helpers';

async function addFillUp(
  page: Page,
  {
    odometer,
    gallons,
    cost,
    partial = false,
  }: { odometer: string; gallons: string; cost: string; partial?: boolean },
) {
  await page.getByRole('link', { name: 'Add fill-up' }).click();
  await page.getByLabel('Mileage at fill-up').fill(odometer);
  await page.getByLabel('Gallons').fill(gallons);
  await page.getByLabel('Total cost').fill(cost);
  if (partial) await page.getByLabel('Filled to full').uncheck();
  await page.getByRole('button', { name: 'Save fill-up' }).click();
  await expect(page.getByText('Overall MPG')).toBeVisible();
}

test('per-fill and overall MPG match hand calculations', async ({ page }, info) => {
  await openApp(page, info);
  await addVehicle(page, { mileage: '10000' });
  await page.getByRole('link', { name: 'Fuel', exact: true }).click();

  await addFillUp(page, { odometer: '10000', gallons: '12', cost: '42' });
  await expect(page.getByText('Not enough data')).toBeVisible();

  // 300 miles on 10 gallons is 30.0 MPG.
  await addFillUp(page, { odometer: '10300', gallons: '10', cost: '35' });
  await expect(page.getByText('30.0').first()).toBeVisible();

  // Partial fill: no MPG of its own.
  await addFillUp(page, { odometer: '10500', gallons: '4', cost: '14', partial: true });
  await expect(page.getByText('Partial')).toBeVisible();

  // 500 miles on 4 + 6 gallons is 50.0 MPG. Overall: 800 miles on 20 gallons is 40.0.
  await addFillUp(page, { odometer: '10800', gallons: '6', cost: '21' });
  await expect(page.getByText('50.0')).toBeVisible();
  await expect(page.getByText('40.0')).toBeVisible();

  await page.reload();
  await expect(page.getByText('40.0')).toBeVisible();
  await expect(page.getByText('10,800 mi', { exact: true })).toBeVisible();
});

test('electric vehicles have no fuel log', async ({ page }, info) => {
  await openApp(page, info);
  await addVehicle(page, { make: 'Tesla', model: 'Model Y' });
  await expect(page.getByRole('link', { name: 'Fuel', exact: true })).toHaveCount(0);
});
