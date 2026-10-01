const { withAndroidManifest } = require('expo/config-plugins');

// Expo prebuild adds link schemes but does not remove old ones when switching variants.
module.exports = function withVariantLinks(config) {
  return withAndroidManifest(config, config => {
    const current = new Set([config.scheme, `exp+${config.slug}`]);
    for (const app of config.modResults.manifest.application ?? []) {
      for (const activity of app.activity ?? []) {
        for (const filter of activity['intent-filter'] ?? []) {
          if (!filter.data) continue;
          filter.data = filter.data.filter(item => {
            const scheme = item.$['android:scheme'];
            const owned = scheme === 'iwalkeveryday' || scheme?.startsWith('iwalkeveryday-')
              || scheme === 'exp+i-walk-everyday' || scheme?.startsWith('exp+i-walk-everyday-');
            return !owned || current.has(scheme);
          });
        }
      }
    }
    return config;
  });
};
