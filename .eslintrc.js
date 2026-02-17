/**
 * ESLint Configuration
 *
 * Configures linting rules for JavaScript code in the React Native project.
 * Extends the React Native community preset and adds custom rules for:
 * - JavaScript best practices
 * - React and React Hooks patterns
 * - React Native specific rules
 * - Firebase integration guidelines
 * - Code quality standards
 *
 * @see https://eslint.org/docs/user-guide/configuring
 */
module.exports = {
  root: true,
  extends: '@react-native',
  plugins: ['react-hooks', 'react-native'],
  rules: {
    // JavaScript Best Practices
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'object-shorthand': 'error',
    'no-duplicate-imports': 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    curly: ['error', 'all'],
    'no-throw-literal': 'error',
    'no-return-await': 'error',

    // React Best Practices
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/prop-types': 'off', // Not using PropTypes in favor of JSDoc
    'react/display-name': 'off',
    'react/jsx-no-bind': ['warn', { allowArrowFunctions: true }],
    'react/jsx-key': 'error',
    'react/no-array-index-key': 'warn',

    // React Hooks Rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // React Native Specific
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    'react-native/no-raw-text': 'off', // Can be enabled later for i18n

    // Code Quality
    'no-debugger': 'error',
    'no-alert': 'warn',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-with': 'error',
    'no-new-func': 'error',

    // Firebase Best Practices
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['firebase/*'],
            message:
              'Use @react-native-firebase packages instead of web Firebase SDK',
          },
        ],
      },
    ],
  },
  env: {
    'react-native/react-native': true,
    es6: true,
    node: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
};
