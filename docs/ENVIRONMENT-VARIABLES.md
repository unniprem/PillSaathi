# Environment Variables Documentation

Version: 1.0  
Date: 2026-02-17  
Project: PillSathi

---

## Overview

PillSathi uses environment variables to manage configuration across different environments (development and production). This document describes all environment variables, their purpose, and how to configure them.

---

## Environment Files

The project uses two environment files:

- `.env.development` - Development environment configuration
- `.env.production` - Production environment configuration

These files are loaded by `react-native-config` and are **NOT** committed to version control (listed in `.gitignore`).

---

## How Environment Variables Work

1. Environment variables are defined in `.env.development` or `.env.production`
2. The active environment file is selected during build time
3. Variables are accessed in JavaScript using `react-native-config`:
   ```javascript
   import Config from 'react-native-config';
   const projectId = Config.FIREBASE_PROJECT_ID;
   ```
4. Firebase services are automatically configured using `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)

---

## Environment Variables Reference

### Core Environment

#### `ENV`

- **Type**: String
- **Values**: `development` | `production`
- **Required**: Yes
- **Description**: Identifies the current environment
- **Example**: `ENV=development`

---

### Firebase Project Configuration

#### `FIREBASE_PROJECT_ID`

- **Type**: String
- **Required**: Yes
- **Description**: Firebase project identifier
- **Where to find**: Firebase Console → Project Settings → General
- **Example**: `FIREBASE_PROJECT_ID=pillsathi-dev`

#### `FIREBASE_PROJECT_NUMBER`

- **Type**: String (numeric)
- **Required**: Yes
- **Description**: Firebase project number (used for messaging)
- **Where to find**: Firebase Console → Project Settings → General
- **Example**: `FIREBASE_PROJECT_NUMBER=1054326980522`

#### `FIREBASE_STORAGE_BUCKET`

- **Type**: String
- **Required**: Yes
- **Description**: Firebase Storage bucket URL
- **Where to find**: Firebase Console → Project Settings → General
- **Example**: `FIREBASE_STORAGE_BUCKET=pillsathi-dev.firebasestorage.app`

#### `FIREBASE_AUTH_DOMAIN`

- **Type**: String
- **Required**: Yes
- **Description**: Firebase Authentication domain
- **Where to find**: Firebase Console → Project Settings → General
- **Example**: `FIREBASE_AUTH_DOMAIN=pillsathi-dev.firebaseapp.com`

---

### Firebase Android Configuration

#### `FIREBASE_ANDROID_APP_ID`

- **Type**: String
- **Required**: Yes (for Android)
- **Description**: Firebase Android app identifier
- **Where to find**: `google-services.json` → `client[0].client_info.mobilesdk_app_id`
- **Example**: `FIREBASE_ANDROID_APP_ID=1:1054326980522:android:2b05aa3888748b513635d3`

#### `FIREBASE_ANDROID_API_KEY`

- **Type**: String
- **Required**: Yes (for Android)
- **Description**: Firebase Android API key
- **Where to find**: `google-services.json` → `client[0].api_key[0].current_key`
- **Example**: `FIREBASE_ANDROID_API_KEY=AIzaSyAgVjBrS8Uz6QXqb6cLJOpcQkn9degehA8`

---

### Firebase iOS Configuration

#### `FIREBASE_IOS_APP_ID`

- **Type**: String
- **Required**: Yes (for iOS)
- **Description**: Firebase iOS app identifier
- **Where to find**: `GoogleService-Info.plist` → `GOOGLE_APP_ID`
- **Example**: `FIREBASE_IOS_APP_ID=1:1054326980522:ios:abc123def456`

#### `FIREBASE_IOS_API_KEY`

- **Type**: String
- **Required**: Yes (for iOS)
- **Description**: Firebase iOS API key
- **Where to find**: `GoogleService-Info.plist` → `API_KEY`
- **Example**: `FIREBASE_IOS_API_KEY=AIzaSyAbc123Def456Ghi789`

#### `FIREBASE_IOS_CLIENT_ID`

- **Type**: String
- **Required**: Yes (for iOS)
- **Description**: Firebase iOS OAuth client ID
- **Where to find**: `GoogleService-Info.plist` → `CLIENT_ID`
- **Example**: `FIREBASE_IOS_CLIENT_ID=1054326980522-abc123.apps.googleusercontent.com`

---

### Firebase Web Configuration

#### `FIREBASE_WEB_API_KEY`

- **Type**: String
- **Required**: No (optional for web-based auth flows)
- **Description**: Firebase Web API key
- **Where to find**: Firebase Console → Project Settings → General → Web API Key
- **Example**: `FIREBASE_WEB_API_KEY=AIzaSyAgVjBrS8Uz6QXqb6cLJOpcQkn9degehA8`

---

### Firebase Messaging

#### `FIREBASE_MESSAGING_SENDER_ID`

- **Type**: String (numeric)
- **Required**: Yes
- **Description**: Firebase Cloud Messaging sender ID (same as project number)
- **Where to find**: Firebase Console → Project Settings → Cloud Messaging
- **Example**: `FIREBASE_MESSAGING_SENDER_ID=1054326980522`

---

### App Configuration

#### `APP_NAME`

- **Type**: String
- **Required**: Yes
- **Description**: Application display name
- **Example**:
  - Development: `APP_NAME=PillSathi Dev`
  - Production: `APP_NAME=PillSathi`

#### `APP_BUNDLE_ID`

- **Type**: String
- **Required**: Yes (for iOS)
- **Description**: iOS bundle identifier
- **Example**: `APP_BUNDLE_ID=com.pillsaathi`

#### `APP_PACKAGE_NAME`

- **Type**: String
- **Required**: Yes (for Android)
- **Description**: Android package name
- **Example**: `APP_PACKAGE_NAME=com.pillsaathi`

---

### API Configuration

#### `API_BASE_URL`

- **Type**: String (URL)
- **Required**: Yes
- **Description**: Base URL for Cloud Functions API
- **Example**:
  - Development: `API_BASE_URL=https://us-central1-pillsathi-dev.cloudfunctions.net`
  - Production: `API_BASE_URL=https://us-central1-pillsathi-prod.cloudfunctions.net`

---

### Feature Flags

#### `ENABLE_DEBUG_LOGS`

- **Type**: Boolean (string)
- **Values**: `true` | `false`
- **Required**: No
- **Default**: `false`
- **Description**: Enable verbose debug logging
- **Recommendation**:
  - Development: `true`
  - Production: `false`

#### `ENABLE_FIREBASE_EMULATOR`

- **Type**: Boolean (string)
- **Values**: `true` | `false`
- **Required**: No
- **Default**: `false`
- **Description**: Connect to Firebase emulator instead of live services
- **Recommendation**:
  - Development: `false` (unless testing with emulator)
  - Production: `false`

#### `ENABLE_PUSH_NOTIFICATIONS`

- **Type**: Boolean (string)
- **Values**: `true` | `false`
- **Required**: No
- **Default**: `true`
- **Description**: Enable Firebase Cloud Messaging push notifications
- **Recommendation**: `true` for both environments

#### `ENABLE_LOCAL_NOTIFICATIONS`

- **Type**: Boolean (string)
- **Values**: `true` | `false`
- **Required**: No
- **Default**: `true`
- **Description**: Enable local notifications (medication reminders)
- **Recommendation**: `true` for both environments

#### `ENABLE_REDUX_DEVTOOLS`

- **Type**: Boolean (string)
- **Values**: `true` | `false`
- **Required**: No
- **Default**: `false`
- **Description**: Enable Redux DevTools integration
- **Recommendation**:
  - Development: `true`
  - Production: `false`

#### `ENABLE_PERFORMANCE_MONITORING`

- **Type**: Boolean (string)
- **Values**: `true` | `false`
- **Required**: No
- **Default**: `false`
- **Description**: Enable Firebase Performance Monitoring
- **Recommendation**:
  - Development: `false`
  - Production: `true`

---

### Firebase Emulator Configuration

These variables are only used when `ENABLE_FIREBASE_EMULATOR=true`.

#### `FIRESTORE_EMULATOR_HOST`

- **Type**: String (host:port)
- **Required**: No (only if using emulator)
- **Description**: Firestore emulator host and port
- **Example**: `FIRESTORE_EMULATOR_HOST=localhost:8080`

#### `AUTH_EMULATOR_HOST`

- **Type**: String (host:port)
- **Required**: No (only if using emulator)
- **Description**: Firebase Auth emulator host and port
- **Example**: `AUTH_EMULATOR_HOST=localhost:9099`

#### `FUNCTIONS_EMULATOR_HOST`

- **Type**: String (host:port)
- **Required**: No (only if using emulator)
- **Description**: Cloud Functions emulator host and port
- **Example**: `FUNCTIONS_EMULATOR_HOST=localhost:5001`

---

## Setup Instructions

### Initial Setup

1. **Copy template files** (if they exist):

   ```bash
   cp .env.development.template .env.development
   cp .env.production.template .env.production
   ```

2. **Configure development environment**:

   - Open `.env.development`
   - Fill in Firebase configuration from `google-services.json` (Android)
   - Fill in Firebase configuration from `GoogleService-Info.plist` (iOS)
   - Set feature flags as needed

3. **Configure production environment**:
   - Open `.env.production`
   - Fill in Firebase configuration from production Firebase project
   - Set feature flags appropriately for production

### Extracting Firebase Configuration

#### From Android (`google-services.json`)

```bash
# Project ID
grep "project_id" android/app/google-services.json

# Project Number
grep "project_number" android/app/google-services.json

# App ID
grep "mobilesdk_app_id" android/app/google-services.json

# API Key
grep "current_key" android/app/google-services.json
```

#### From iOS (`GoogleService-Info.plist`)

```bash
# App ID
grep -A 1 "GOOGLE_APP_ID" ios/PillSaathi/GoogleService-Info.plist

# API Key
grep -A 1 "API_KEY" ios/PillSaathi/GoogleService-Info.plist

# Client ID
grep -A 1 "CLIENT_ID" ios/PillSaathi/GoogleService-Info.plist
```

---

## Building with Different Environments

### Android

#### Development Build

```bash
cd android
./gradlew assembleDebug
```

#### Production Build

```bash
cd android
./gradlew assembleRelease
```

### iOS

#### Development Build

```bash
# Set scheme to Debug in Xcode
# Build and run
```

#### Production Build

```bash
# Set scheme to Release in Xcode
# Build and archive
```

---

## Switching Environments

### During Development

To switch between environments during development:

1. **Android**:

   - Edit `android/app/build.gradle`
   - Change the environment file loaded in `project.ext.envConfigFiles`

2. **iOS**:
   - Edit build scheme in Xcode
   - Set environment variables in scheme settings

### For Testing

To test with different environments:

```bash
# Test with development environment
ENVFILE=.env.development npm run android

# Test with production environment
ENVFILE=.env.production npm run android
```

---

## Security Best Practices

### DO NOT Commit

- Never commit `.env.development` or `.env.production` to version control
- Verify `.env*` is in `.gitignore`
- Use template files (`.env.development.template`) for documentation

### Sensitive Values

The following values should be treated as sensitive:

- All API keys (`FIREBASE_*_API_KEY`)
- Client IDs (`FIREBASE_IOS_CLIENT_ID`)
- App IDs (less sensitive but still private)

### Sharing Configuration

When sharing configuration with team members:

1. Use a secure channel (encrypted messaging, password manager)
2. Share only the necessary environment file
3. Rotate keys if accidentally exposed

---

## Troubleshooting

### Environment Variables Not Loading

**Problem**: `Config.VARIABLE_NAME` returns `undefined`

**Solutions**:

1. Verify variable is defined in the correct `.env` file
2. Rebuild the app (environment variables are bundled at build time)
3. Check for typos in variable names
4. Ensure `react-native-config` is properly installed

### Wrong Environment Active

**Problem**: App connects to wrong Firebase project

**Solutions**:

1. Check which `.env` file is being loaded
2. Verify `google-services.json` matches the environment
3. Clean and rebuild the app
4. Check `ENV` variable value

### Firebase Connection Errors

**Problem**: Cannot connect to Firebase services

**Solutions**:

1. Verify all required Firebase variables are set
2. Check Firebase project is active in Firebase Console
3. Verify `google-services.json` and `GoogleService-Info.plist` are up to date
4. Check network connectivity
5. Review Firebase Console for service status

---

## Validation

### Verify Environment Configuration

Use the built-in verification script:

```bash
node scripts/verify-firebase-dev-connection.js
```

Or check in the app:

```javascript
import { getEnvironmentInfo } from './src/config/firebase';

console.log(getEnvironmentInfo());
```

### Expected Output

```javascript
{
  environment: 'development',
  indicator: 'DEV',
  isDevelopment: true,
  isProduction: false,
  projectId: 'pillsathi-dev',
  authDomain: 'pillsathi-dev.firebaseapp.com',
  debugLogsEnabled: true
}
```

---

## Related Documentation

- [Firebase Setup Guide](./FIREBASE-SETUP-GUIDE.md)
- [Android Setup Guide](./ANDROID-SETUP-GUIDE.md)
- [iOS Setup Guide](./IOS-SETUP-GUIDE.md)
- [Common Issues and Solutions](./COMMON-ISSUES-AND-SOLUTIONS.md)
- [Debugging Guide](./DEBUGGING-SETUP.md)

---

## Maintenance

### When to Update

Update environment variables when:

- Creating a new Firebase project
- Registering a new platform (Android/iOS)
- Rotating API keys
- Changing Cloud Functions region
- Adding new feature flags

### Version History

- **1.0** (2026-02-17): Initial documentation
  - Documented all Firebase configuration variables
  - Documented app configuration variables
  - Documented feature flags
  - Added setup and troubleshooting guides
