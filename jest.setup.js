/**
 * Jest Setup File
 *
 * Global mocks and configuration for Jest tests
 */

// Mock react-native-config
jest.mock('react-native-config', () => ({
  ENV: 'development',
  FIREBASE_PROJECT_ID: 'pillsathi-dev',
  FIREBASE_PROJECT_NUMBER: '1054326980522',
  FIREBASE_STORAGE_BUCKET: 'pillsathi-dev.firebasestorage.app',
  FIREBASE_ANDROID_APP_ID: '1:1054326980522:android:2b05aa3888748b513635d3',
  FIREBASE_ANDROID_API_KEY: 'AIzaSyAgVjBrS8Uz6QXqb6cLJOpcQkn9degehA8',
  FIREBASE_IOS_APP_ID: '',
  FIREBASE_IOS_API_KEY: '',
  FIREBASE_IOS_CLIENT_ID: '',
  FIREBASE_WEB_API_KEY: 'AIzaSyAgVjBrS8Uz6QXqb6cLJOpcQkn9degehA8',
  FIREBASE_AUTH_DOMAIN: 'pillsathi-dev.firebaseapp.com',
  FIREBASE_MESSAGING_SENDER_ID: '1054326980522',
  APP_NAME: 'PillSathi Dev',
  APP_BUNDLE_ID: 'com.pillsaathi',
  APP_PACKAGE_NAME: 'com.pillsaathi',
  API_BASE_URL: 'https://us-central1-pillsathi-dev.cloudfunctions.net',
  ENABLE_DEBUG_LOGS: 'true',
  ENABLE_FIREBASE_EMULATOR: 'false',
  FIRESTORE_EMULATOR_HOST: '',
  AUTH_EMULATOR_HOST: '',
  FUNCTIONS_EMULATOR_HOST: '',
  ENABLE_PUSH_NOTIFICATIONS: 'true',
  ENABLE_LOCAL_NOTIFICATIONS: 'true',
  ENABLE_REDUX_DEVTOOLS: 'true',
  ENABLE_PERFORMANCE_MONITORING: 'false',
}));

// Suppress console warnings in tests (optional)
global.console = {
  ...console,
  // Uncomment to suppress console logs in tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
