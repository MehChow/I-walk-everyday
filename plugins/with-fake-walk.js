const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withFakeWalk(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const app = manifest.application[0];
    const rationale = 'expo.modules.fakewalk.PermissionRationaleActivity';
    app.activity = app.activity || [];
    if (!app.activity.some((item) => item.$['android:name'] === rationale)) {
      app.activity.push({ $: { 'android:name': rationale, 'android:exported': 'true', 'android:theme': '@android:style/Theme.Material.NoActionBar' } });
    }
    const aliasName = 'expo.modules.fakewalk.HealthPermissionUsage';
    app['activity-alias'] = (app['activity-alias'] || []).filter((item) => item.$['android:name'] !== aliasName);
    app['activity-alias'].push({
      $: {
        'android:name': aliasName,
        'android:exported': 'true',
        'android:targetActivity': 'expo.modules.fakewalk.PermissionRationaleActivity',
        'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
      },
      'intent-filter': [{
        action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
        category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
      }],
    });
    return config;
  });
};
