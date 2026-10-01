// Re-export the native module. On web, it will be resolved to FakeWalkModule.web.ts
// and on native platforms to FakeWalkModule.ts
export { default } from './src/FakeWalkModule';
export * from './src/FakeWalk.types';
