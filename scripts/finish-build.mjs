// Gives the build its stable release name and enforces the size budget.
import { readdirSync, readFileSync, renameSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 400 * 1024;
const output = 'dist/garage.html';

renameSync('dist/index.html', output);

const extras = readdirSync('dist').filter((name) => name !== 'garage.html');
if (extras.length > 0) {
  console.error(`Build must be a single file, but also produced: ${extras.join(', ')}`);
  process.exit(1);
}

const gzipped = gzipSync(readFileSync(output)).length;
console.log(`${output}: ${(gzipped / 1024).toFixed(1)} KB gzipped`);
if (gzipped > BUDGET_BYTES) {
  console.error(`Over the ${BUDGET_BYTES / 1024} KB budget.`);
  process.exit(1);
}
