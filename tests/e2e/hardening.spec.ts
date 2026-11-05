import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addVehicle, openApp } from './helpers';

test('backup and restore round trip', async ({ page }, info) => {
  await openApp(page, info);
  await addVehicle(page, { description: 'Backed up' });

  await page.goto(`${page.url().split('#')[0]}#/settings`);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download backup' }).click(),
  ]);
  const path = await download.path();
  expect(download.suggestedFilename()).toMatch(/^garage-backup-\d{4}-\d{2}-\d{2}\.json$/);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel('Restore from file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: readFileSync(path),
  });
  await page.getByRole('button', { name: 'Replace my data' }).click();
  await expect(page.getByRole('link', { name: /Backed up/ }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: /Backed up/ }).first()).toBeVisible();
});

test('damaged data is preserved and recoverable', async ({ page }, info) => {
  await openApp(page, info);
  await page.evaluate(() => localStorage.setItem('garage.data', '{damaged'));
  await page.reload();
  await expect(page.getByText("We couldn't read your saved data")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('garage.data'))).toBe('{damaged');
  await expect(page.getByRole('button', { name: 'Download my data' })).toBeVisible();
});

test('a change in one tab reaches another', async ({ page, context }, info) => {
  await openApp(page, info);
  const second = await context.newPage();
  await second.goto(page.url());
  await addVehicle(page, { description: 'From tab one' });
  await expect(second.getByRole('link', { name: /From tab one/ }).first()).toBeVisible();
});

test('the app makes no network requests and enforces that', async ({ page }, info) => {
  const appUrl: string = info.project.metadata.appUrl;
  const external: string[] = [];
  page.on('request', (request) => {
    const url = request.url().split('#')[0];
    if (url !== appUrl && !url?.startsWith('data:')) external.push(request.url());
  });
  await openApp(page, info);
  await page.getByRole('button', { name: 'Load sample data' }).click();
  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
  expect(external).toEqual([]);

  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  expect(csp).toContain("connect-src 'none'");
  const blocked = await page.evaluate(() =>
    fetch('https://example.com').then(
      () => false,
      () => true,
    ),
  );
  expect(blocked).toBe(true);
});

test('sample data covers the whole journey with no accessibility violations', async ({
  page,
}, info) => {
  await openApp(page, info);

  const scan = async (label: string) => {
    const { violations } = await new AxeBuilder({ page }).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${label}: ${v.id} ${v.nodes[0]?.html}`)).toEqual([]);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(fits, `${label} has no horizontal scroll`).toBe(true);
  };

  await scan('empty garage');
  await page.getByRole('button', { name: 'Load sample data' }).click();
  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
  await scan('garage');

  await page
    .getByRole('link', { name: /Family SUV/ })
    .last()
    .click();
  await expect(page.getByRole('heading', { name: 'Family SUV' })).toBeVisible();
  await scan('maintenance tab');

  await page.getByRole('link', { name: 'Service', exact: true }).click();
  await expect(page.getByText('Total spent:')).toBeVisible();
  await scan('service history');

  await page.getByRole('link', { name: 'Log service' }).click();
  await expect(page.getByRole('heading', { name: 'Log service' })).toBeVisible();
  await page.getByRole('button', { name: 'Save service' }).click();
  await expect(page.getByText('Choose at least one service')).toBeVisible();
  await scan('service form with errors');

  await page.getByRole('link', { name: 'Back to vehicle' }).click();
  await page.getByRole('link', { name: 'Fuel', exact: true }).click();
  await expect(page.getByText('Overall MPG')).toBeVisible();
  await scan('fuel log');

  await page.getByRole('link', { name: 'Add fill-up' }).click();
  await expect(page.getByRole('heading', { name: 'Add fill-up' })).toBeVisible();
  await scan('fuel form');

  await page.goto(`${page.url().split('#')[0]}#/vehicles/sample-crv/insurance`);
  await expect(page.getByRole('heading', { name: 'Sample Mutual' })).toBeVisible();
  await scan('vehicle insurance tab');

  await page.getByRole('link', { name: /Edit/ }).last().click();
  await expect(page.getByRole('heading', { name: 'Edit policy' })).toBeVisible();
  await scan('policy form');

  await page.getByRole('banner').getByRole('link', { name: 'Insurance' }).click();
  await expect(page.getByRole('heading', { name: 'Example Insurance' })).toBeVisible();
  await scan('insurance page');

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await scan('settings');

  await page.goto(`${page.url().split('#')[0]}#/vehicles/new`);
  await expect(page.getByRole('heading', { name: 'Add vehicle' })).toBeVisible();
  await scan('vehicle form');
});
