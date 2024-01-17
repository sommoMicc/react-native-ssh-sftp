// eslint-disable-next-line @typescript-eslint/no-var-requires
const process = require('process');
const devBuild = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  env: {
    es6: true,
  },
  plugins: [
    '@typescript-eslint'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  rules: {
    // this rule helps us be honest with our code annotations
    'no-warning-comments': ['warn', { terms: ['todo', 'fixme', 'xxx', 'bug'], location: 'anywhere' }],

    // don't be using the console in production, that's just silly
    'no-console': [devBuild ? 'warn' : 'error', { allow: ['assert'] }],

    // these rules help us keep the code readable & consistent
    'max-len': ['warn', { code: 240 }],
    'max-lines-per-function': ['error', { max: 50, skipComments: true, skipBlankLines: true }],
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'no-trailing-spaces': ['error'],
    'semi': ['error', 'always'],
  },
};
