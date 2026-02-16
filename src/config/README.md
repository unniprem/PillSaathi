# Firebase Configuration

This directory contains Firebase configuration and initialization code for the PillSathi application.

## Files

- `firebase.js` - Main Firebase configuration module
- `firebase.usage.example.js` - Usage examples for Firebase services

## Overview

The Firebase configuration module provides a centralized way to initialize and access Firebase services throughout the application. It automatically switches between development and production Firebase projects based on environment variables.

## Features

- ✅ Environment-aware configuration (dev/prod)
- ✅ Centralized Firebase service exports
- ✅ Automatic Firestore offline persistence
- ✅ Debug logging in development mode
- ✅ Type-safe exports with JSDoc comments

## Quick Start

### 1. Initialize Firebase in App.js

```javascript
import { useEffect } from 'react';
import firebase from './src/config/firebase';

function App() {
  useEffect(() => {
    firebase.initializeFirebase();
  }, []);

  return <YourAppComponents />;
}
```

### 2. Use Firebase Services

```javascript
import {
  firebaseAuth,
  firebaseFirestore,
  firebaseMessaging,
} from './src/config/firebase';

// Use Auth
const user = firebaseAuth.currentUser;

// Use Firestore
const usersRef = firebaseFirestore.collection('users');

// Use Messaging
const token = await firebaseMessaging.getToken();
```

## Exported Functions

### Firebase Instances

- `firebaseAuth` - Firebase Authentication instance
- `firebaseFirestore` - Firestore database instance
- `firebaseMessaging` - Firebase Cloud Messaging instance

### Utility Functions

- `getEnvironment()` - Returns current environment ('development' or 'production')
- `getEnvironmentIndicator()` - Returns short environment indicator ('DEV' or 'PROD')
- `getEnvironmentInfo()` - Returns detailed environment information object
- `isDevelopment()` - Returns true if running in development mode
- `isProduction()` - Returns true if running in production mode
- `getFirebaseConfig()` - Returns Firebase configuration object
- `initializeFirebase()` - Initializes Firebase services (call once at app start)
- `logFirebaseInfo()` - Logs Firebase initialization info (dev mode only)

### Default Export

The module also exports a default object containing all services and utilities:

```javascript
import firebase from './src/config/firebase';

firebase.auth; // Auth instance
firebase.firestore; // Firestore instance
firebase.messaging; // Messaging instance
firebase.getEnvironment(); // Get environment name
firebase.getEnvironmentIndicator(); // Get short indicator (DEV/PROD)
firebase.getEnvironmentInfo(); // Get detailed environment info
```

## Environment Indicator

The module provides convenient functions to identify the current environment:

### `getEnvironmentIndicator()`

Returns a short string indicator for the current environment:

```javascript
import { getEnvironmentIndicator } from './src/config/firebase';

const indicator = getEnvironmentIndicator();
// Returns: 'DEV' in development, 'PROD' in production
```

### `getEnvironmentInfo()`

Returns detailed environment information:

```javascript
import { getEnvironmentInfo } from './src/config/firebase';

const info = getEnvironmentInfo();
// Returns:
// {
//   environment: 'development',
//   indicator: 'DEV',
//   isDevelopment: true,
//   isProduction: false,
//   projectId: 'pillsathi-dev',
//   authDomain: 'pillsathi-dev.firebaseapp.com',
//   debugLogsEnabled: true
// }
```

### Use Cases

1. **Display environment badge in UI:**

```javascript
function EnvironmentBadge() {
  const indicator = getEnvironmentIndicator();
  const isDev = isDevelopment();

  if (!isDev) return null;

  return (
    <View style={{ backgroundColor: '#ff9800', padding: 4 }}>
      <Text style={{ color: '#fff' }}>{indicator}</Text>
    </View>
  );
}
```

2. **Conditional feature flags:**

```javascript
if (getEnvironmentIndicator() === 'DEV') {
  // Enable debug features
  enableDebugMenu();
}
```

3. **Logging with environment context:**

```javascript
console.log(`[${getEnvironmentIndicator()}] User logged in`);
// Output: [DEV] User logged in
```

## Environment Variables

The following environment variables are required (defined in `.env.development` and `.env.production`):

```bash
# Environment
ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_ANDROID_APP_ID=your-android-app-id
FIREBASE_ANDROID_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com

# Optional
ENABLE_DEBUG_LOGS=true
```

## Configuration

Firebase is automatically configured using:

- `google-services.json` (Android) - Located in `android/app/`
- `GoogleService-Info.plist` (iOS) - Located in `ios/PillSaathi/`

These files are generated when you register your app in the Firebase Console.

## Firestore Settings

The module automatically configures Firestore with:

- Offline persistence enabled
- Unlimited cache size

You can modify these settings in the `initializeFirebase()` function.

## Debug Logging

In development mode with `ENABLE_DEBUG_LOGS=true`, the module logs:

- Firebase initialization status
- Current environment
- Project ID
- Auth domain

## Testing

Tests are located in `__tests__/firebase.test.js`. Run tests with:

```bash
npm test -- __tests__/firebase.test.js
```

## Troubleshooting

### Firebase not connecting

1. Verify `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) is in the correct location
2. Check environment variables are loaded correctly
3. Ensure Firebase project has required services enabled (Auth, Firestore, Messaging)
4. Check console for initialization errors

### Environment not switching

1. Verify `.env.development` and `.env.production` files exist
2. Check `ENV` variable is set correctly in each file
3. Rebuild the app after changing environment files
4. Clear build cache if needed

### Offline persistence issues

If you encounter Firestore persistence errors:

1. Clear app data/cache
2. Uninstall and reinstall the app
3. Check device storage space

## Best Practices

1. Initialize Firebase once at app startup
2. Use named exports for specific services
3. Check environment before enabling debug features
4. Handle Firebase errors gracefully
5. Don't commit `.env` files to version control

## Related Documentation

- [Firebase Setup Guide](../../FIREBASE-SETUP-GUIDE.md)
- [React Native Firebase Docs](https://rnfirebase.io/)
- [Environment Configuration](../../REACT-NATIVE-CONFIG-SETUP.md)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Firebase Console for project configuration
3. Check React Native Firebase documentation
4. Review app logs for error messages
