import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';

import baseConfig from '../eslint.config.mjs';

export default defineConfig([
  ...baseConfig,
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
