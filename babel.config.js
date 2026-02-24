/**
 * Babel Configuration
 *
 * Configures Babel transpilation for React Native.
 * Uses the default React Native preset which includes:
 * - JSX transformation
 * - ES6+ syntax support
 * - Flow type stripping (if used)
 * - Module transformation
 *
 * @see https://reactnative.dev/docs/babel
 */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
};
