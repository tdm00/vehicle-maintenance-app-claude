import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const script = resolve('scripts/next-version.sh');
let repo: string;

function git(...args: string[]) {
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], {
    cwd: repo,
    stdio: 'pipe',
  });
}

const commit = () => git('commit', '-q', '--allow-empty', '-m', 'x');
const tag = (...names: string[]) => {
  for (const name of names) git('tag', name);
};
const nextVersion = () =>
  execFileSync(script, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'next-version-'));
  git('init', '-q');
  commit();
});

afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe('next-version.sh', () => {
  test('starts at v1', () => {
    expect(nextVersion()).toBe('version=v1');
  });

  test('ignores tags that are not plain vN', () => {
    tag('v1.2.3', 'nightly', 'v2-beta');
    expect(nextVersion()).toBe('version=v1');
  });

  test('sorts numerically, so v10 beats v9', () => {
    tag('v2', 'v9', 'v10');
    commit();
    expect(nextVersion()).toBe('version=v11');
  });

  test('prints nothing when HEAD is already released, which guards reruns', () => {
    tag('v4');
    expect(nextVersion()).toBe('');
  });

  test('a non-version tag on HEAD does not count as released', () => {
    tag('v4');
    commit();
    tag('nightly');
    expect(nextVersion()).toBe('version=v5');
  });
});
