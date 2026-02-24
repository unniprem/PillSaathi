/**
 * Mock for @react-native-firebase/functions
 */

export const getFunctions = jest.fn();
export const httpsCallable = jest.fn();

export default {
  getFunctions,
  httpsCallable,
};
