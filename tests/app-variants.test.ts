import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const expoCli = require.resolve('expo/bin/cli');

function inspect(variant?: string) {
  const env = { ...process.env };
  if (variant === undefined) delete env.APP_VARIANT;
  else env.APP_VARIANT = variant;
  return spawnSync(process.execPath, [expoCli, 'config', '--type', 'introspect', '--json'], {
    cwd: process.cwd(), env, encoding: 'utf8', timeout: 30000,
  });
}

it.each([
  ['dev', 'Iwe dev', 'com.mehchow.iwalkeveryday.dev', 'iwalkeveryday-dev', 'i-walk-everyday-dev'],
  ['apk', 'Iwe APK', 'com.mehchow.iwalkeveryday.apk', 'iwalkeveryday-apk', 'i-walk-everyday-apk'],
  ['prod', 'I walk everyday', 'com.mehchow.iwalkeveryday', 'iwalkeveryday', 'i-walk-everyday'],
])('generates the %s app identity and excludes other variants’ links', (variant, name, packageId, scheme, slug) => {
  const result = inspect(variant);
  expect(result.status, result.stderr).toBe(0);
  const config = JSON.parse(result.stdout);
  expect(config.name).toBe(name);
  expect(config.android.package).toBe(packageId);
  expect(config.scheme).toBe(scheme);
  expect(config.slug).toBe(slug);
  const native = config._internal.modResults.android;
  expect(native.strings.resources.string.find((item: { $: { name: string } }) => item.$.name === 'app_name')._).toBe(name);
  const main = native.manifest.manifest.application[0].activity.find((item: { $: Record<string, string> }) => item.$['android:name'] === '.MainActivity');
  const schemes = main['intent-filter'].flatMap((filter: { data?: { $: Record<string, string> }[] }) =>
    (filter.data ?? []).map(item => item.$['android:scheme']));
  expect([...new Set(schemes)].sort()).toEqual([scheme, `exp+${slug}`].sort());
}, 30000);

it('defaults to the development app', () => {
  const result = inspect();
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).android.package).toBe('com.mehchow.iwalkeveryday.dev');
}, 30000);

it('rejects an unknown variant rather than building the wrong app', () => {
  const result = inspect('production');
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Unknown APP_VARIANT');
}, 30000);
