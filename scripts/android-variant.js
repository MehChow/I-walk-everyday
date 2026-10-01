const { spawnSync } = require('node:child_process');
const { copyFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const [variant, command, ...args] = process.argv.slice(2);
if (!['dev', 'apk', 'prod'].includes(variant) || !['start', 'prebuild', 'run', 'build'].includes(command)) {
  console.error('Usage: node scripts/android-variant.js <dev|apk|prod> <start|prebuild|run|build>');
  process.exit(1);
}
if (command === 'start' && variant !== 'dev') {
  console.error('Only the dev app uses Metro. APK and Prod bundle JavaScript locally.');
  process.exit(1);
}
if (command === 'build' && args.length) {
  console.error('The build command creates an arm64 APK and does not accept additional arguments.');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
process.env.APP_VARIANT = variant;
const config = require('../app.config')({ config: require('../app.json').expo });
const expoCli = require.resolve('expo/bin/cli');
const buildType = variant === 'dev' ? 'debug' : 'release';

function run(executable, argv, cwd = root) {
  const result = spawnSync(executable, argv, { cwd, env: process.env, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function expo(argv) {
  run(process.execPath, [expoCli, ...argv]);
}

if (command === 'start') {
  // Expo's Android launcher reads the package ID from generated Gradle files.
  // Point it back at Dev after an APK/Prod build, without compiling native code.
  expo(['prebuild', '--platform', 'android', '--no-install', '--no-clean']);
  expo(['start', '--dev-client', '--scheme', config.scheme, ...args]);
} else {
  // Recreate generated native files: React Native's autolinking cache retains the
  // previous package ID when only applying prebuild changes in place.
  expo(['prebuild', '--platform', 'android', '--no-install', '--clean', ...(command === 'prebuild' ? args : [])]);
  if (command === 'run') {
    expo(['run:android', '--variant', buildType, '--app-id', config.android.package, '--device', ...args]);
  } else if (command === 'build') {
    const task = variant === 'dev' ? ':app:assembleDebug' : ':app:assembleRelease';
    const androidRoot = path.join(root, 'android');
    if (process.platform === 'win32') {
      run('cmd.exe', ['/d', '/s', '/c', `gradlew.bat ${task} -PreactNativeArchitectures=arm64-v8a`], androidRoot);
    } else {
      run('./gradlew', [task, '-PreactNativeArchitectures=arm64-v8a'], androidRoot);
    }
    const output = path.join(root, 'dist', 'apks');
    mkdirSync(output, { recursive: true });
    const apkPath = path.join(output, `${variant}.apk`);
    copyFileSync(path.join(androidRoot, 'app', 'build', 'outputs', 'apk', buildType, `app-${buildType}.apk`), apkPath);
    console.log(`\n${config.name} (${config.android.package}): ${apkPath}`);
  }
}
