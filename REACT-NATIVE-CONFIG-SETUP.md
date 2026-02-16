# React Native Config Setup

This document explains how react-native-config is configured in the PillSathi project.

## Overview

react-native-config allows you to expose environment variables to your JavaScript code in React Native. This is useful for managing different configurations for development and production environments.

## Configuration

### Android Setup

The Android configuration is set up in `android/app/build.gradle`:

```gradle
// Apply react-native-config plugin
project.ext.envConfigFiles = [
    debug: ".env.development",
    release: ".env.production",
]
apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"
```

This configuration:

- Uses `.env.development` for debug builds
- Uses `.env.production` for release builds
- Automatically loads environment variables during the build process

### Environment Files

The project uses two environment files:

1. `.env.development` - Development environment configuration
2. `.env.production` - Production environment configuration

A symlink `.env` points to `.env.development` by default for local development.

## Usage in JavaScript

Import and use Config in your JavaScript/React Native code:

```javascript
import Config from 'react-native-config';

console.log('Environment:', Config.ENV);
console.log('Firebase Project ID:', Config.FIREBASE_PROJECT_ID);
console.log('App Name:', Config.APP_NAME);
```

## Available Environment Variables

See `.env.development` and `.env.production` for the full list of available variables.

Key variables include:

- `ENV` - Environment name (development/production)
- `FIREBASE_PROJECT_ID` - Firebase project identifier
- `FIREBASE_ANDROID_APP_ID` - Firebase Android app ID
- `FIREBASE_ANDROID_API_KEY` - Firebase Android API key
- `APP_NAME` - Application name
- `ENABLE_DEBUG_LOGS` - Enable/disable debug logging

## Building for Different Environments

### Debug Build (Development)

```bash
cd android
./gradlew assembleDebug
```

This will use `.env.development`

### Release Build (Production)

```bash
cd android
./gradlew assembleRelease
```

This will use `.env.production`

## Switching Environments Locally

To switch between environments locally, update the `.env` symlink:

```bash
# Switch to development
ln -sf .env.development .env

# Switch to production
ln -sf .env.production .env
```

## iOS Setup

iOS configuration will be added in a future task. The setup will involve:

1. Adding a build phase script to Xcode
2. Configuring Info.plist to read environment variables
3. Testing on iOS simulator/device

## Troubleshooting

### Environment variables not loading

1. Ensure the `.env` symlink exists and points to the correct file
2. Clean and rebuild the project:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug
   ```

### Build errors related to react-native-config

1. Verify react-native-config is installed:
   ```bash
   npm list react-native-config
   ```
2. Reinstall if necessary:
   ```bash
   npm install react-native-config
   ```

## Security Notes

- Never commit sensitive credentials to `.env` files
- Use Firebase security rules to protect production data
- Consider using a secrets management service for production deployments
- The `.gitignore` file is configured to ignore all `.env*` files

## References

- [react-native-config documentation](https://github.com/luggit/react-native-config)
- [React Native environment variables best practices](https://reactnative.dev/docs/environment-variables)
