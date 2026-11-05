import { expect, test } from '@playwright/test';
import { addVehicle, openApp } from './helpers';

test('add, edit, and delete a vehicle, surviving reloads', async ({ page }, info) => {
  await openApp(page, info);
  await expect(page.getByText('Your garage is empty')).toBeVisible();

  await addVehicle(page, { make: 'Ford', model: 'F-150', description: 'Work truck' });
  await expect(page.getByRole('img', { name: 'Truck illustration' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Work truck' })).toBeVisible();

  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Description').fill('Farm truck');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Farm truck' })).toBeVisible();

  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete vehicle' }).click();
  await expect(page.getByText('Your garage is empty')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Your garage is empty')).toBeVisible();
});

test('the page has no horizontal scroll', async ({ page }, info) => {
  await openApp(page, info);
  await addVehicle(page);
  await page.getByRole('link', { name: 'My Garage' }).click();
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(fits).toBe(true);
});
