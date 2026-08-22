// Shared base ESLint config for the SafePath monorepo.
//
// This only holds rules that apply everywhere (ignores + Prettier
// compatibility). Framework-specific rules (Next.js, Expo/React Native)
// live in each app's own eslint.config.mjs, which imports and extends
// this file.
import prettierConfig from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
const baseConfig = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/coverage/**',
    ],
  },
  prettierConfig,
];

export default baseConfig;
