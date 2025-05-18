import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  {
    ignores: ['.next/**/*', 'node_modules/**/*'],
  },
  ...compat.config({
    root: true,
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'next/core-web-vitals'
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-wrapper-object-types': 'error'
    }
  })
];
