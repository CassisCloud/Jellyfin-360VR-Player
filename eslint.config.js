import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'test/artifacts/**', 'test/vendor/**', 'jellyfin-vr.js', 'jellyfin-vr.min.js']
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'test/**/*.js', 'test/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-unreachable': 'error'
    }
  },
  {
    files: ['test/iwer-auto-test.js', 'test/iwer-jfvr-smoke-test.js'],
    languageOptions: {
      globals: {
        __JFVR_TEST_API__: 'readonly',
        __IWER_AUTO_RESULTS__: 'writable',
        __JFVR_SMOKE_RESULTS__: 'writable'
      }
    }
  }
];
