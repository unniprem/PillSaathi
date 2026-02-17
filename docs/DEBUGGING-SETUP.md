# React Native Debugging Setup Guide

This guide covers debugging setup for the PillSathi React Native application.

## Overview

PillSathi uses multiple debugging tools depending on the platform and debugging needs:

1. **React Native DevTools** (Built-in, recommended)
2. **Flipper** (Advanced debugging)
3. **Chrome DevTools** (Legacy, for web debugging)
4. **VS Code Debugger** (IDE integration)

---

## 1. React Native DevTools (Recommended)

React Native DevTools is the official debugging tool built into React Native.

### Setup

No installation required - it's built into React Native 0.73+.

### Usage

1. Start the Metro bundler:

   ```bash
   npm start
   ```

2. Open the Dev Menu:

   - **Android**: Press `Cmd + M` (Mac) or `Ctrl + M` (Windows/Linux) in emulator, or shake device
   - **iOS**: Press `Cmd + D` in simulator, or shake device

3. Select "Open React DevTools" from the menu

4. DevTools will open in your browser with:
   - Component tree inspector
   - Props and state viewer
   - Console logs
   - Network inspector

### Features

- Inspect React component hierarchy
- View and edit component props/state
- Monitor network requests
- View console logs
- Performance profiling

---

## 2. Flipper (Advanced Debugging)

Flipper provides advanced debugging capabilities including network inspection, database viewing, and more.

### Installation

1. Download Flipper from: https://fbflipper.com/

2. Install Flipper desktop app

3. Flipper is already configured in React Native 0.73+

### Usage

1. Start Flipper desktop app

2. Run your app:

   ```bash
   npm run android
   # or
   npm run ios
   ```

3. Your app should automatically connect to Flipper

### Features

- Network inspector (view all API calls)
- Layout inspector
- Database viewer (AsyncStorage, SQLite)
- Crash reporter
- Performance monitor
- Redux DevTools integration

### Troubleshooting

If Flipper doesn't connect:

1. Check that Flipper is running before starting the app
2. Ensure your device/emulator is on the same network
3. Try restarting both Flipper and the app
4. Check Flipper logs for connection errors

---

## 3. Chrome DevTools (Legacy)

Chrome DevTools can be used for JavaScript debugging.

### Setup

No installation required.

### Usage

1. Open Dev Menu (see above)

2. Select "Debug" or "Debug with Chrome"

3. Chrome will open with DevTools

4. Use the Console, Sources, and Network tabs

### Note

This method is being deprecated in favor of React Native DevTools. Use for legacy compatibility only.

---

## 4. VS Code Debugger

Debug directly from VS Code with breakpoints and step-through debugging.

### Setup

1. Install "React Native Tools" extension in VS Code

2. Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Android",
      "cwd": "${workspaceFolder}",
      "type": "reactnative",
      "request": "launch",
      "platform": "android"
    },
    {
      "name": "Debug iOS",
      "cwd": "${workspaceFolder}",
      "type": "reactnative",
      "request": "launch",
      "platform": "ios"
    },
    {
      "name": "Attach to packager",
      "cwd": "${workspaceFolder}",
      "type": "reactnative",
      "request": "attach"
    }
  ]
}
```

### Usage

1. Set breakpoints in your code

2. Press `F5` or go to Run > Start Debugging

3. Select "Debug Android" or "Debug iOS"

4. App will launch with debugger attached

### Features

- Set breakpoints
- Step through code
- Inspect variables
- Watch expressions
- Call stack navigation

---

## 5. Debugging Firebase

### Enable Firebase Debug Logging

Add to your code temporarily:

```javascript
// In src/config/firebase.js
if (__DEV__) {
  // Enable Firestore debug logging
  firebase.firestore.setLogLevel('debug');
}
```

### View Firebase Logs

**Android:**

```bash
adb logcat | grep -i firebase
```

**iOS:**

```bash
# In Xcode: View > Debug Area > Show Debug Area
# Filter logs by "Firebase"
```

---

## 6. Network Debugging

### Using Flipper

1. Open Flipper
2. Select "Network" plugin
3. View all network requests with full details

### Using React Native Debugger

1. Open React Native DevTools
2. Go to Network tab
3. View fetch/XHR requests

### Using Proxy (Charles/Proxyman)

For HTTPS inspection:

1. Install Charles Proxy or Proxyman
2. Configure device to use proxy
3. Install SSL certificate on device
4. View all network traffic

---

## 7. Performance Debugging

### React Native Performance Monitor

1. Open Dev Menu
2. Select "Show Perf Monitor"
3. View FPS, memory usage, and JS thread performance

### Flipper Performance Plugin

1. Open Flipper
2. Select "React DevTools" plugin
3. Go to Profiler tab
4. Record and analyze component renders

---

## 8. Common Debugging Scenarios

### App Crashes on Launch

1. Check Metro bundler logs
2. Check native logs (adb logcat / Xcode console)
3. Look for red screen errors
4. Check for missing dependencies

### Firebase Connection Issues

1. Verify `google-services.json` / `GoogleService-Info.plist` are in place
2. Check Firebase console for project configuration
3. Enable Firebase debug logging
4. Check network connectivity

### Navigation Issues

1. Use React Navigation DevTools
2. Check navigation state in React DevTools
3. Add console logs to navigation events
4. Verify screen names match navigation config

### State Management Issues

1. Use React DevTools to inspect component state
2. Add console logs to state updates
3. Use Redux DevTools if using Redux
4. Check for stale closures

---

## 9. Debugging Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "android:debug": "react-native run-android --variant=debug",
    "ios:debug": "react-native run-ios --configuration Debug",
    "log:android": "adb logcat *:S ReactNative:V ReactNativeJS:V",
    "log:ios": "react-native log-ios",
    "clean:android": "cd android && ./gradlew clean && cd ..",
    "clean:ios": "cd ios && xcodebuild clean && cd .."
  }
}
```

---

## 10. Best Practices

1. **Use console.log strategically**: Don't leave debug logs in production code

2. **Use **DEV** flag**: Wrap debug code in `if (__DEV__) { ... }`

3. **Enable Hermes debugger**: React Native 0.70+ uses Hermes by default

4. **Use TypeScript**: Catch errors at compile time

5. **Test on real devices**: Emulators don't always match real device behavior

6. **Monitor performance**: Use Performance Monitor regularly

7. **Check native logs**: Many issues are in native code, not JavaScript

8. **Use source maps**: Ensure source maps are enabled for readable stack traces

---

## 11. Troubleshooting

### Metro Bundler Won't Start

```bash
# Clear Metro cache
npm start -- --reset-cache

# Or
npx react-native start --reset-cache
```

### Debugger Won't Connect

1. Ensure device and computer are on same network
2. Check firewall settings
3. Restart Metro bundler
4. Restart app

### Red Screen Errors

1. Read the error message carefully
2. Check the stack trace
3. Look for file and line number
4. Fix the error and reload

### Yellow Box Warnings

1. Address warnings to prevent future issues
2. Use `LogBox.ignoreAllLogs()` only for demos (not production)

---

## 12. Additional Resources

- [React Native Debugging Docs](https://reactnative.dev/docs/debugging)
- [Flipper Documentation](https://fbflipper.com/docs/features/react-native/)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [VS Code React Native Tools](https://marketplace.visualstudio.com/items?itemName=msjsdiag.vscode-react-native)

---

## Summary

For most debugging needs, use:

1. **React Native DevTools** for component inspection
2. **Flipper** for network and database debugging
3. **VS Code Debugger** for breakpoint debugging
4. **Native logs** for crash investigation

Happy debugging! 🐛
