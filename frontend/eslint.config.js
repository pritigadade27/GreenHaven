import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * Flat config, which is what ESLint 9+ expects. package.json has defined a
 * `lint` script since the start but no config file ever existed, so the command
 * failed immediately and nothing was ever linted.
 */
export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // The new JSX transform means React need not be in scope.
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',

      // This project deliberately does not use PropTypes; it would be a second
      // type system to maintain by hand alongside the components themselves.
      'react/prop-types': 'off',

      // A caught error that is intentionally ignored is written `catch {}` here,
      // so an unused binding is a genuine mistake worth reporting.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
];
