import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import-x';
import nPlugin from 'eslint-plugin-n';
import prettierPluginRecommended from 'eslint-plugin-prettier/recommended';
import { configs as typescriptEslintConfigs } from 'typescript-eslint';

// TODO: Upgrade eslint-plugin-import-x when it supports flag config, and
//       uninstall @typescript-eslint/parser if no longer necessary as a
//       standalone module (it's already exported from typescript-eslint)
export default [
  { ignores: ['build/'] },
  eslint.configs.recommended,
  ...typescriptEslintConfigs.strict,
  ...typescriptEslintConfigs.stylistic,
  {
    plugins: { 'import-x': importPlugin },
    rules: {
      ...importPlugin.configs.recommended.rules,
      'import-x/no-named-as-default': 'error',
      'import-x/no-named-as-default-member': 'error',
      'import-x/no-duplicates': 'error',
      ...importPlugin.configs.typescript.rules,
    },
    settings: {
      ...importPlugin.configs.typescript.settings,
      'import-x/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
        typescript: { alwaysTryTypes: true },
      },
    },
  },
  nPlugin.configs['flat/recommended'],
  prettierPluginRecommended,
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      curly: 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'import-x/newline-after-import': 'error',
      'import-x/order': [
        'error',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: [['builtin', 'external'], 'internal', 'parent', 'sibling'],
          'newlines-between': 'never',
        },
      ],
      'n/prefer-node-protocol': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'prettier/prettier': 'warn',
      'sort-imports': ['error', { ignoreCase: true, ignoreDeclarationSort: true }],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    rules: {
      '@typescript-eslint/consistent-indexed-object-style': 'error',
      '@typescript-eslint/consistent-type-definitions': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
    },
  },
];
