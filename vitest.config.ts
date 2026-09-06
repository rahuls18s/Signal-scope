import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', include: ['src/**/*.spec.ts'], coverage: { provider:'v8', include:['src/app/core/utils/debug-ledger.ts','src/app/core/services/reactive-debug-engine.ts'], thresholds:{ lines:80, functions:80, statements:80, branches:70 }, reporter:['text','html'] } }
});
