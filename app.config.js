const variants = {
  dev: { name: 'Iwe dev', suffix: '.dev', scheme: 'iwalkeveryday-dev', slug: 'i-walk-everyday-dev' },
  apk: { name: 'Iwe APK', suffix: '.apk', scheme: 'iwalkeveryday-apk', slug: 'i-walk-everyday-apk' },
  prod: { name: 'I walk everyday', suffix: '', scheme: 'iwalkeveryday', slug: 'i-walk-everyday' },
};

module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT ?? 'dev';
  if (!Object.hasOwn(variants, variant)) {
    throw new Error(`Unknown APP_VARIANT: ${variant}. Use dev, apk, or prod.`);
  }
  const identity = variants[variant];
  return {
    ...config,
    name: identity.name,
    slug: identity.slug,
    scheme: identity.scheme,
    android: { ...config.android, package: `com.mehchow.iwalkeveryday${identity.suffix}` },
    plugins: [...(config.plugins ?? []), './plugins/with-variant-links'],
  };
};
