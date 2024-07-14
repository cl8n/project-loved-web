import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactPluginJsxRuntime from 'eslint-plugin-react/configs/jsx-runtime.js';
import reactPluginRecommended from 'eslint-plugin-react/configs/recommended.js';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import lovedConfig from 'loved-eslint-config';

export default [
  ...lovedConfig,
  { ignores: ['config/', 'scripts/', 'src/compiled-translations/'] },
  jsxA11yPlugin.flatConfigs.strict,
  reactPluginRecommended,
  reactPluginJsxRuntime,
  {
    plugins: { 'react-hooks': reactHooksPlugin },
    rules: reactHooksPlugin.configs.recommended.rules,
  },
  {
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
      'jsx-a11y/click-events-have-key-events': 'off',
      // TODO: This should probably be enabled
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-noninteractive-tabindex': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'n/no-missing-import': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      'react/display-name': 'off',
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
    },
    settings: {
      react: { version: 'detect' },
      linkComponents: [
        { name: 'NavLink', linkAttribute: 'to' },
        { name: 'Link', linkAttribute: 'to' },
      ],
    },
  },
];
