# Environment Variable Testing Guide

This guide explains how to test that environment variables are loading correctly in the PillSathi app.

## Overview

The app uses `react-native-config` to load environment variables from `.env` files. This is critical for managing different configurations between development and production environments.

## Testing Methods

### 1. Automated Tests (Jest)

Run the environment variable tests:

```bash
npm test -- __tests__/envTest.test.js
```

This will verify:

- Critical environment variables are loaded
- Firebase configuration is present
- App configuration is correct
- Environment detection works

### 2. Runtime Testing (App Launch)

The app automatically tests environment variable loading when it starts:

1. Build and run the app:

   ```bash
   npm run android
   # or
   npm run ios
   ```

2. Check the console output for:

   ```
   🔧 Testing environment variable loading...

   === Environment Variable Test Report ===

   Status: ✅ PASS

   Loaded Variables:
     ENV: development
     FIREBASE_PROJECT_ID: pillsathi-dev
     ...

   ✅ Environment variables loaded successfully!
   ```

### 3. Manual Testing

You can manually test environment variables in your code:

```javascript
import Config from 'react-native-config';
import { testEnvLoading, getCurrentEnvironment } from './src/utils/envTest';

// Get current environment
console.log('Environment:', getCurrentEnvironment());

// Test all variables
const results = testEnvLoading();
console.log('Test passed:', results.success);
console.log('Errors:', results.errors);
console.log('Variables:', results.variables);

// Access specific variables
console.log('Firebase Project:', Config.FIREBASE_PROJECT_ID);
console.log('App Name:', Config.APP_NAME);
```

## Test Utility Functions

The `src/utils/envTest.js` module provides several utility functions:

### `testEnvLoading()`

Tests that all critical environment variables are loaded.

Returns:

```javascript
{
  success: boolean,
  errors: string[],
  warnings: string[],
  variables: object
}
```

### `getEnvTestReport()`

Returns a formatted string report of the test results.

### `logEnvTest()`

Logs the test report to console and returns success status.

### `getCurrentEnvironment()`

Returns the current environment name ('development' or 'production').

### `isDevelopment()`

Returns true if running in development mode.

### `isProduction()`

Returns true if running in production mode.

## Critical Variables

These variables must be present for the app to function:

- `ENV` - Environment name (development/production)
- `FIREBASE_PROJECT_ID` - Firebase project identifier
- `FIREBASE_ANDROID_APP_ID` - Firebase Android app ID
- `FIREBASE_ANDROID_API_KEY` - Firebase Android API key
- `APP_NAME` - Application name

## Optional Variables

These variables are optional but recommended:

- `FIREBASE_IOS_APP_ID` - Firebase iOS app ID (required for iOS)
- `FIREBASE_IOS_API_KEY` - Firebase iOS API key (required for iOS)
- `API_BASE_URL` - Backend API URL
- `ENABLE_DEBUG_LOGS` - Enable debug logging

## Troubleshooting

### Variables not loading

1. Verify the `.env` file exists and is properly formatted
2. Check that `.env` symlink points to the correct file:
   ```bash
   ls -la .env
   ```
3. Clean and rebuild:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug
   ```

### Wrong environment loaded

1. Check which `.env` file is being used:
   - Debug builds use `.env.development`
   - Release builds use `.env.production`
2. Verify the `ENV` variable in the file matches the expected environment

### Tests failing

1. Run tests with verbose output:
   ```bash
   npm test -- __tests__/envTest.test.js --verbose
   ```
2. Check that all critical variables are defined in your `.env` file
3. Verify `react-native-config` is properly installed:
   ```bash
   npm list react-native-config
   ```

## Switching Environments

### For Development

```bash
ln -sf .env.development .env
npm run android
```

### For Production

```bash
ln -sf .env.production .env
cd android
./gradlew assembleRelease
```

## Security Notes

- Never log sensitive values (API keys, secrets) in production
- The test utility automatically masks values containing 'KEY' or 'SECRET'
- Always use `.gitignore` to exclude `.env*` files from version control

## Next Steps

After verifying environment variables load correctly:

1. ✅ Environment variables are loading
2. → Create Firebase configuration module (`src/config/firebase.js`)
3. → Initialize Firebase services
4. → Test Firebase connection

## References

- [react-native-config documentation](https://github.com/luggit/react-native-config)
- [REACT-NATIVE-CONFIG-SETUP.md](./REACT-NATIVE-CONFIG-SETUP.md)
- [.env.development](./.env.development)
