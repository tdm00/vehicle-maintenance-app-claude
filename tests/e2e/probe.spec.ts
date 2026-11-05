import { copyFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from '@playwright/test';

test('PROBE file storage scope', async ({ page }, info) => {
  test.skip(info.project.name !== 'firefox-file');
  const dir = mkdtempSync(join(tmpdir(), 'probe-'));
  mkdirSync(join(dir, 'a'));
  mkdirSync(join(dir, 'b'));
  const files = ['a/garage.html', 'a/garage (1).html', 'b/garage.html'];
  for (const f of files) copyFileSync('dist/garage.html', join(dir, f));
  const url = (f: string) => pathToFileURL(join(dir, f)).href;
  await page.goto(url('a/garage.html'));
  await page.evaluate(() => localStorage.setItem('probe', '1'));
  const out: Record<string, string | null> = {};
  for (const f of files) {
    await page.goto(url(f));
    out[f] = await page.evaluate(() => localStorage.getItem('probe'));
  }
  throw new Error(`PROBE_RESULT ${JSON.stringify(out)}`);
});
