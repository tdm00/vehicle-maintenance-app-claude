import { expect, test } from '@playwright/test';
import { addVehicle, openApp } from './helpers';

test('a task appears, and clears once the service is logged', async ({ page }, info) => {
  await openApp(page, info);
  await addVehicle(page, { mileage: '50000' });

  // Log an oil change 20,000 miles ago, which is well past any interval.
  await page.getByRole('link', { name: 'Log service' }).click();
  await page.getByLabel('Mileage (optional)').fill('30000');
  await page.getByRole('checkbox', { name: 'Oil change' }).check();
  await page.getByRole('button', { name: 'Save service' }).click();

  await page.getByRole('link', { name: 'My Garage' }).click();
  const tasks = page.getByRole('region', { name: 'Needs attention' });
  await expect(tasks.getByText('Overdue')).toBeVisible();

  await tasks.getByRole('link', { name: /Log Oil change/ }).click();
  await expect(page.getByRole('checkbox', { name: 'Oil change' })).toBeChecked();
  await page.getByRole('button', { name: 'Save service' }).click();

  await page.getByRole('link', { name: 'My Garage' }).click();
  await expect(tasks.getByText('Nothing is due right now.')).toBeVisible();
  await page.reload();
  await expect(tasks.getByText('Nothing is due right now.')).toBeVisible();
});

test('an electric vehicle is not told to change its oil', async ({ page }, info) => {
  await openApp(page, info);
  await addVehicle(page, { make: 'Tesla', model: 'Model 3' });
  await expect(page.getByText('Tire rotation')).toBeVisible();
  await expect(page.getByText('Oil change')).toHaveCount(0);
});
