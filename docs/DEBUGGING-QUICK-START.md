# Debugging Quick Start Guide

Quick reference for debugging PillSathi React Native app.

## Quick Commands

### Start Development Server

```bash
npm start
# or with cache reset
npm run start:reset
```

### Run with Debugging

```bash
# Android
npm run android:debug

# iOS
npm run ios:debug
```

### View Logs

```bash
# Android logs
npm run log:android

# iOS logs
npm run log:ios
```

### Clean Build

```bash
# Android
npm run clean:android

# iOS
npm run clean:ios
```

---

## Open Dev Menu

### Android

- Emulator: `Cmd + M` (Mac) or `Ctrl + M` (Windows/Linux)
- Device: Shake the device

### iOS

- Simulator: `Cmd + D`
- Device: Shake the device

---

## Common Debug Actions

### 1. Inspect Components

1. Open Dev Menu
2. Select "Open React DevTools"
3. Inspect component tree, props, and state

### 2. View Network Requests

1. Open Flipper app
2. Select "Network" plugin
3. View all API calls

### 3. Debug with Breakpoints

1. Open VS Code
2. Set breakpoints in code
3. Press `F5` and select "Debug Android" or "Debug iOS"

### 4. Check Firebase Connection

```javascript
import { debugFirebase } from './src/utils/debugUtils';

// In your code
debugFirebase('Connection Test', { status: 'connected' });
```

### 5. Monitor Performance

1. Open Dev Menu
2. Select "Show Perf Monitor"
3. View FPS and memory usage

---

## Debug Utilities

Use the debug utilities in `src/utils/debugUtils.js`:

```javascript
import {
  debugLog,
  debugError,
  debugTimer,
  debugNavigation,
  debugFirebase,
} from './src/utils/debugUtils';

// Simple logging
debugLog('MyComponent', { data: 'value' });

// Error logging
debugError('API Call', new Error('Failed to fetch'));

// Performance timing
const endTimer = debugTimer('Data Processing');
// ... do work ...
endTimer();

// Navigation debugging
debugNavigation('Navigate', { screen: 'Home' });

// Firebase debugging
debugFirebase('Firestore Query', { collection: 'users' });
```

---

## Enable Firebase Debug Logging

In `.env.development`:

```
ENABLE_DEBUG_LOGS=true
```

Then restart the app.

---

## Troubleshooting

### App Won't Start

```bash
# Reset Metro cache
npm run start:reset

# Clean and rebuild
npm run clean:android
npm run android:debug
```

### Debugger Won't Connect

1. Ensure device and computer are on same network
2. Restart Metro bundler
3. Restart app
4. Check firewall settings

### Red Screen Errors

1. Read error message
2. Check stack trace for file and line number
3. Fix error
4. Reload app (double tap `R` in Dev Menu)

---

## VS Code Debugging

1. Install "React Native Tools" extension
2. Open Run and Debug panel (`Cmd + Shift + D`)
3. Select configuration:
   - "Debug Android" - Launch Android app with debugger
   - "Debug iOS" - Launch iOS app with debugger
   - "Attach to packager" - Attach to running app
4. Press `F5` to start debugging

---

## Flipper Setup

1. Download from https://fbflipper.com/
2. Install and open Flipper
3. Run your app
4. App should auto-connect to Flipper

### Flipper Plugins

- **Network**: View all network requests
- **Layout**: Inspect UI layout
- **Databases**: View AsyncStorage and SQLite
- **React DevTools**: Inspect React components
- **Logs**: View console logs

---

## Debug Environment Info

Check current environment:

```javascript
import { getDebugInfo } from './src/utils/debugUtils';

console.log(getDebugInfo());
// Output:
// {
//   isDev: true,
//   platform: 'android',
//   version: 33,
//   environment: 'development'
// }
```

---

## Production Debugging

All debug utilities automatically disable in production builds.

To test production behavior:

```bash
# Build release version
cd android && ./gradlew assembleRelease

# Install release APK
adb install app/build/outputs/apk/release/app-release.apk
```

---

## Additional Resources

- Full debugging guide: `docs/DEBUGGING-SETUP.md`
- React Native Debugging: https://reactnative.dev/docs/debugging
- Flipper: https://fbflipper.com/

---

## Quick Tips

✅ Use `__DEV__` to wrap debug code  
✅ Check native logs for crashes  
✅ Test on real devices, not just emulators  
✅ Use Flipper for network debugging  
✅ Enable source maps for readable stack traces  
✅ Monitor performance regularly  
✅ Clear Metro cache if seeing stale code

---

Happy debugging! 🐛🔍
