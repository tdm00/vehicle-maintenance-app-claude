import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { addVehicle, openApp } from './helpers';

const isoInDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test('a shared policy, its reminder, and renewal survive a reload', async ({ page }, info) => {
  await openApp(page, info);
  await addVehicle(page, { description: 'Family SUV' });
  await addVehicle(page, { description: 'Work truck', make: 'Ford', model: 'F-150' });

  await page
    .getByRole('navigation', { name: 'Vehicle sections' })
    .getByRole('link', { name: 'Insurance' })
    .click();
  await page.getByRole('link', { name: 'Add policy' }).click();
  await expect(page.getByRole('checkbox', { name: 'Work truck' })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Family SUV' }).check();
  await page.getByLabel('Company').fill('Sample Mutual');
  await page.getByLabel('Policy number').fill('SM-1');
  await page.getByLabel('Expiration date').fill(isoInDays(10));
  await page.getByLabel('Phone (optional)').fill('800-555-0100');
  await page.getByLabel('Notes (optional)').fill('Roadside included');
  await page.getByRole('button', { name: 'Save policy' }).click();
  await expect(page.getByRole('heading', { name: 'Sample Mutual' })).toBeVisible();

  await page.reload();
  await expect(page.getByText('Roadside included')).toBeVisible();

  await page.getByRole('link', { name: 'My Garage' }).click();
  const tasks = page.getByRole('region', { name: 'Needs attention' });
  await expect(tasks.getByText('Expiring soon')).toBeVisible();
  await expect(tasks.getByText(/Family SUV, Work truck/)).toBeVisible();

  await tasks.getByRole('link', { name: /Update/ }).click();
  await page.getByLabel('Expiration date').fill(isoInDays(365));
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Active')).toBeVisible();

  await page.getByRole('banner').getByRole('link', { name: 'Garage' }).click();
  await expect(tasks.getByText('Expiring soon')).toHaveCount(0);
});

test('a save from the first release upgrades in the browser', async ({ page }, info) => {
  await openApp(page, info);
  const saved = readFileSync('tests/fixtures/v1-save.json', 'utf8');
  await page.evaluate((text) => localStorage.setItem('garage.data', text), saved);
  await page.reload();
  await expect(page.getByRole('link', { name: /Family SUV/ }).first()).toBeVisible();
  await expect(page.getByText('68,400 mi')).toBeVisible();
  await page.goto(`${page.url().split('#')[0]}#/insurance`);
  await expect(page.getByText('No insurance on file')).toBeVisible();
});
