import regexPlugin from 'eslint-plugin-regex';
import lovedConfig from 'loved-eslint-config';

export default [
  ...lovedConfig,
  {
    plugins: { regex: regexPlugin },
    rules: {
      'n/hashbang': ['error', { additionalExecutables: ['/src/bin/*.ts'] }],
      'n/no-process-exit': 'off',
      'regex/invalid': [
        'error',
        [
          /* eslint-disable regex/invalid */
          {
            regex: '\\.locals',
            message: 'Use `typedLocals` instead',
          },
          {
            regex: 'INSERT[^()]+VALUES',
            message: 'List fields when running INSERTs',
          },
          /* eslint-enable regex/invalid */
        ],
      ],
    },
  },
];
