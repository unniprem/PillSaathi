# Common Issues and Solutions - PillSathi

Quick reference guide for common issues encountered during PillSathi development and their solutions.

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Build Issues](#build-issues)
3. [Firebase Issues](#firebase-issues)
4. [Environment Issues](#environment-issues)
5. [Navigation Issues](#navigation-issues)
6. [Dependency Issues](#dependency-issues)
7. [Platform-Specific Issues](#platform-specific-issues)
8. [Development Tools Issues](#development-tools-issues)

---

## Quick Diagnostics

Before troubleshooting specific issues, run these diagnostic commands:

```bash
# Check versions
node --version    # Should be 18+
npm --version     # Should be 8+

# Verify Firebase connection
node scripts/verify-firebase-dev-connection.js

# Run tests
npm test -- __tests__/firebaseConnection.test.js

# Check for package issues
npm list --depth=0

# Check for outdated packages
npm outdated
```

---

## Build Issues

### Issue: Build fails with "Command failed" error

**Symptoms**: Build process stops with generic error message

**Solutions**:

1. **Clean build cache**:

   ```bash
   # Android
   cd android && ./gradlew clean && cd ..

   # iOS
   cd ios && xcodebuild clean && cd ..

   # Metro
   npm start -- --reset-cache
   ```

2. **Reinstall dependencies**:

   ```bash
   rm -rf node_modules
   npm install

   # iOS only
   cd ios && bundle exec pod install && cd ..
   ```

3. **Check for disk space**:
   ```bash
   df -h
   ```

### Issue: "Unable to resolve module" errors

**Symptoms**: Import statements fail, module not found

**Solutions**:

1. **Verify module is installed**:

   ```bash
   npm list <module-name>
   ```

2. **Clear Metro cache**:

   ```bash
   npm start -- --reset-cache
   ```

3. **Check import path**:

   - Verify relative paths are correct
   - Check for typos
   - Ensure file extensions match

4. **Reinstall specific package**:
   ```bash
   npm uninstall <package-name>
   npm install <package-name>
   ```

### Issue: Build succeeds but app crashes on launch

**Symptoms**: App builds without errors but crashes immediately when opened

**Solutions**:

1. **Check console logs**:

   ```bash
   # Android
   adb logcat | grep -E "ReactNative|Firebase"

   # iOS
   xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "PillSaathi"'
   ```

2. **Verify Firebase configuration**:

   - Check `google-services.json` (Android)
   - Check `GoogleService-Info.plist` (iOS)
   - Verify environment variables are loaded

3. **Check for missing permissions** in manifest files

4. **Clear app data and reinstall**:

   ```bash
   # Android
   adb shell pm clear com.pillsaathi
   npm run android

   # iOS
   xcrun simctl uninstall booted com.pillsaathi
   npm run ios
   ```

---

## Firebase Issues

### Issue: Firebase not initialized

**Symptoms**: `Firebase app not initialized` or `undefined` errors

**Solutions**:

1. **Verify configuration files exist**:

   ```bash
   # Android
   ls -la android/app/google-services.json

   # iOS
   ls -la ios/PillSaathi/GoogleService-Info.plist
   ```

2. **Check Firebase initialization** in `src/config/firebase.js`:

   ```javascript
   import { firebase } from '@react-native-firebase/app';

   if (!firebase.apps.length) {
     // Firebase should auto-initialize
   }
   ```

3. **Verify Firebase packages are installed**:

   ```bash
   npm list @react-native-firebase/app
   npm list @react-native-firebase/auth
   npm list @react-native-firebase/firestore
   ```

4. **Rebuild the app**:

   ```bash
   # Android
   cd android && ./gradlew clean && ./gradlew assembleDebug && cd ..

   # iOS
   cd ios && xcodebuild clean && cd ..
   npm run ios
   ```

### Issue: Connecting to wrong Firebase project

**Symptoms**: App connects to dev instead of prod (or vice versa)

**Solutions**:

1. **Check environment file**:

   ```bash
   cat .env.development
   # Verify FIREBASE_PROJECT_ID matches expected project
   ```

2. **Verify configuration file**:

   ```bash
   # Android
   cat android/app/google-services.json | grep project_id

   # iOS
   cat ios/PillSaathi/GoogleService-Info.plist | grep PROJECT_ID
   ```

3. **Build with correct environment**:

   ```bash
   # For development
   npm run android

   # For production
   ENVFILE=.env.production npm run android
   ```

4. **Replace configuration file** if needed:
   - Download correct file from Firebase Console
   - Replace existing file
   - Rebuild app

### Issue: Firestore permission denied

**Symptoms**: `Missing or insufficient permissions` errors

**Solutions**:

1. **Check Firestore rules** in Firebase Console:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;  // Test mode only!
       }
     }
   }
   ```

2. **Verify user is authenticated** (if rules require auth)

3. **Check Firebase project is active** in Firebase Console

4. **Verify billing is enabled** (required for some features)

### Issue: Firebase Authentication errors

**Symptoms**: Auth methods fail or return errors

**Solutions**:

1. **Enable authentication provider** in Firebase Console:

   - Go to Authentication > Sign-in method
   - Enable Phone provider

2. **Check API key restrictions**:

   - Firebase Console > Project Settings > API Keys
   - Ensure Android/iOS apps are allowed

3. **Verify SHA-1 fingerprint** (Android):

   ```bash
   cd android
   ./gradlew signingReport
   # Add SHA-1 to Firebase Console
   ```

4. **Check bundle ID / package name** matches Firebase registration

---

## Environment Issues

### Issue: Environment variables not loading

**Symptoms**: Config values are `undefined` or `null`

**Solutions**:

1. **Verify .env file exists**:

   ```bash
   ls -la .env.development
   cat .env.development
   ```

2. **Check .env file format**:

   - No spaces around `=`
   - No quotes (unless needed)
   - Example: `FIREBASE_PROJECT_ID=pillsathi-dev`

3. **Verify react-native-config is installed**:

   ```bash
   npm list react-native-config
   ```

4. **Check platform configuration**:

   **Android** - `android/app/build.gradle`:

   ```gradle
   project.ext.envConfigFiles = [
       debug: ".env.development",
       release: ".env.production"
   ]
   apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"
   ```

   **iOS** - Build Phase script in Xcode

5. **Clean and rebuild**:

   ```bash
   # Android
   cd android && ./gradlew clean && cd ..

   # iOS
   cd ios && xcodebuild clean && cd ..

   # Restart Metro
   npm start -- --reset-cache
   ```

### Issue: Wrong environment being used

**Symptoms**: App uses dev config when expecting prod

**Solutions**:

1. **Specify environment explicitly**:

   ```bash
   ENVFILE=.env.production npm run android
   ```

2. **Check default environment** in build configuration

3. **Verify environment indicator** in app:
   - Add debug log to show current environment
   - Display environment name in dev builds

---

## Navigation Issues

### Issue: Navigation not working

**Symptoms**: Navigation functions throw errors or don't navigate

**Solutions**:

1. **Verify React Navigation is installed**:

   ```bash
   npm list @react-navigation/native
   npm list @react-navigation/native-stack
   npm list react-native-screens
   npm list react-native-safe-area-context
   ```

2. **Check NavigationContainer** wraps app in `App.js`:

   ```javascript
   import { NavigationContainer } from '@react-navigation/native';

   function App() {
     return <NavigationContainer>{/* Your navigators */}</NavigationContainer>;
   }
   ```

3. **Verify screen names match**:

   - Navigation calls use correct screen names
   - Names are case-sensitive

4. **Check navigation prop** is available:
   - Component is a screen in navigator
   - Or use `useNavigation()` hook

### Issue: Back navigation not working

**Symptoms**: Back button doesn't work or navigates incorrectly

**Solutions**:

1. **Verify stack navigator** is used:

   ```javascript
   import { createNativeStackNavigator } from '@react-navigation/native-stack';
   const Stack = createNativeStackNavigator();
   ```

2. **Check navigation hierarchy** is correct

3. **Test hardware back button** (Android):

   - Should work automatically with stack navigator

4. **Clear navigation state**:
   ```javascript
   // In NavigationContainer
   <NavigationContainer
     onStateChange={(state) => console.log('New state:', state)}
   >
   ```

For detailed navigation troubleshooting, see [Navigation Back Verification](../NAVIGATION-BACK-VERIFICATION.md).

---

## Dependency Issues

### Issue: npm install fails

**Symptoms**: Package installation fails with errors

**Solutions**:

1. **Clear npm cache**:

   ```bash
   npm cache clean --force
   ```

2. **Delete lock file and node_modules**:

   ```bash
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

3. **Check Node.js version**:

   ```bash
   node --version  # Should be 18+
   ```

4. **Try with legacy peer deps**:
   ```bash
   npm install --legacy-peer-deps
   ```

### Issue: Pod install fails (iOS)

**Symptoms**: CocoaPods installation fails with errors

**Solutions**:

1. **Update CocoaPods**:

   ```bash
   sudo gem install cocoapods
   pod --version
   ```

2. **Clear CocoaPods cache**:

   ```bash
   cd ios
   rm -rf Pods
   rm Podfile.lock
   pod cache clean --all
   bundle exec pod install
   cd ..
   ```

3. **Update pod repo**:

   ```bash
   pod repo update
   ```

4. **Deintegrate and reinstall**:
   ```bash
   cd ios
   bundle exec pod deintegrate
   bundle exec pod install
   cd ..
   ```

### Issue: Version conflicts

**Symptoms**: Dependency version mismatch errors

**Solutions**:

1. **Check for conflicting versions**:

   ```bash
   npm list <package-name>
   ```

2. **Update to compatible versions**:

   ```bash
   npm update <package-name>
   ```

3. **Use exact versions** in package.json:

   ```json
   {
     "dependencies": {
       "react-native": "0.73.0" // No ^ or ~
     }
   }
   ```

4. **Check peer dependencies**:
   ```bash
   npm list --depth=0
   ```

---

## Platform-Specific Issues

### Android Issues

#### Issue: SDK location not found

**Symptoms**: `SDK location not found. Define location with sdk.dir...`

**Solutions**:

1. **Set ANDROID_HOME**:

   ```bash
   # Add to ~/.zshrc or ~/.bash_profile
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

2. **Create local.properties**:

   ```bash
   echo "sdk.dir=$ANDROID_HOME" > android/local.properties
   ```

3. **Verify Android SDK is installed** in Android Studio

#### Issue: Gradle build fails

**Symptoms**: Various Gradle errors during build

**Solutions**:

1. **Clean Gradle cache**:

   ```bash
   cd android
   ./gradlew clean
   ./gradlew --refresh-dependencies
   cd ..
   ```

2. **Stop Gradle daemon**:

   ```bash
   cd android
   ./gradlew --stop
   cd ..
   ```

3. **Delete build folders**:

   ```bash
   cd android
   rm -rf app/build
   rm -rf build
   rm -rf .gradle
   cd ..
   ```

4. **Check Gradle version** in `android/gradle/wrapper/gradle-wrapper.properties`

#### Issue: App not installing on device

**Symptoms**: Build succeeds but app doesn't install

**Solutions**:

1. **Check device connection**:

   ```bash
   adb devices
   ```

2. **Restart adb**:

   ```bash
   adb kill-server
   adb start-server
   ```

3. **Uninstall existing app**:

   ```bash
   adb uninstall com.pillsaathi
   ```

4. **Enable USB debugging** on device

5. **Install APK directly**:
   ```bash
   cd android
   ./gradlew installDebug
   cd ..
   ```

### iOS Issues

#### Issue: "No such module" errors

**Symptoms**: Xcode can't find imported modules

**Solutions**:

1. **Clean and rebuild**:

   - Xcode: Product > Clean Build Folder (⇧⌘K)

2. **Reinstall pods**:

   ```bash
   cd ios
   rm -rf Pods
   rm Podfile.lock
   bundle exec pod install
   cd ..
   ```

3. **Delete DerivedData**:

   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData/*
   ```

4. **Check import statements** are correct

#### Issue: Code signing errors

**Symptoms**: Signing fails or provisioning profile errors

**Solutions**:

1. **Enable automatic signing** in Xcode:

   - Select target > Signing & Capabilities
   - Check "Automatically manage signing"

2. **Add Apple ID** to Xcode:

   - Preferences > Accounts
   - Add your Apple ID

3. **Select development team** in project settings

4. **For physical devices**:
   - Ensure device is registered
   - Trust developer certificate on device

#### Issue: Simulator won't boot

**Symptoms**: Simulator fails to start or crashes

**Solutions**:

1. **Reset simulator**:

   ```bash
   xcrun simctl erase all
   ```

2. **Delete and recreate simulator**:

   - Xcode > Window > Devices and Simulators
   - Delete simulator
   - Create new one

3. **Restart Mac** (if persistent)

---

## Development Tools Issues

### Issue: Metro bundler won't start

**Symptoms**: Metro fails to start or crashes

**Solutions**:

1. **Clear Metro cache**:

   ```bash
   npm start -- --reset-cache
   ```

2. **Check for port conflicts** (port 8081):

   ```bash
   # macOS/Linux
   lsof -i :8081
   kill -9 <PID>

   # Windows
   netstat -ano | findstr :8081
   taskkill /PID <PID> /F
   ```

3. **Clear watchman cache** (macOS/Linux):

   ```bash
   watchman watch-del-all
   ```

4. **Restart Metro**:
   ```bash
   npm start
   ```

### Issue: Fast Refresh not working

**Symptoms**: Code changes don't reflect in app

**Solutions**:

1. **Enable Fast Refresh**:

   - Shake device or press Cmd+M (Android) / Cmd+D (iOS)
   - Enable "Fast Refresh" in Dev Menu

2. **Reload manually**:

   - Press 'R' twice in Metro terminal
   - Or reload from Dev Menu

3. **Restart Metro with cache reset**:

   ```bash
   npm start -- --reset-cache
   ```

4. **Check for syntax errors** in code

### Issue: Debugger not connecting

**Symptoms**: Can't connect to React Native debugger

**Solutions**:

1. **Verify debugger is running**:

   - React Native Debugger should be open
   - Or Chrome DevTools

2. **Enable debugging** from Dev Menu:

   - Shake device
   - Select "Debug"

3. **Check port** (default 8081):

   - Ensure no conflicts
   - Debugger uses same port as Metro

4. **Restart both Metro and debugger**

---

## Performance Issues

### Issue: App running slowly

**Symptoms**: App is laggy or unresponsive

**Solutions**:

1. **Use release build** for testing:

   ```bash
   # Android
   cd android && ./gradlew assembleRelease && cd ..

   # iOS
   # In Xcode: Product > Scheme > Edit Scheme > Release
   ```

2. **Enable Hermes** (should be enabled by default):

   - Check `android/app/build.gradle`
   - Check `ios/Podfile`

3. **Remove console.log statements**:

   - Use `__DEV__` flag for dev-only logs

4. **Profile with React DevTools**:
   - Identify slow components
   - Optimize re-renders

### Issue: Large bundle size

**Symptoms**: App takes long to load or is large

**Solutions**:

1. **Use production build**:

   - Production builds are optimized

2. **Check for large dependencies**:

   ```bash
   npm list --depth=0
   ```

3. **Enable Hermes** for better performance

4. **Remove unused dependencies**:
   ```bash
   npm uninstall <unused-package>
   ```

---

## Emergency Reset

If all else fails, perform a complete reset:

```bash
# 1. Clean everything
rm -rf node_modules
rm package-lock.json

# 2. Clean Android
cd android
./gradlew clean
rm -rf app/build
rm -rf build
rm -rf .gradle
cd ..

# 3. Clean iOS
cd ios
rm -rf Pods
rm Podfile.lock
xcodebuild clean
cd ..
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 4. Clear caches
npm cache clean --force
watchman watch-del-all  # macOS/Linux only

# 5. Reinstall everything
npm install
cd ios && bundle install && bundle exec pod install && cd ..

# 6. Start fresh
npm start -- --reset-cache
```

Then in a new terminal:

```bash
# Android
npm run android

# iOS
npm run ios
```

---

## Getting Help

If you're still stuck after trying these solutions:

1. **Check logs carefully**:

   - Android: `adb logcat`
   - iOS: Xcode console
   - Metro: Terminal output

2. **Search for specific error messages**:

   - Google the exact error
   - Check Stack Overflow
   - Check GitHub issues

3. **Consult documentation**:

   - [React Native Docs](https://reactnative.dev/docs/getting-started)
   - [Firebase Docs](https://firebase.google.com/docs)
   - [React Navigation Docs](https://reactnavigation.org/docs/getting-started)

4. **Review setup guides**:

   - [Android Setup Guide](./ANDROID-SETUP-GUIDE.md)
   - [iOS Setup Guide](./IOS-SETUP-GUIDE.md)
   - [Firebase Setup Guide](../FIREBASE-SETUP-GUIDE.md)

5. **Ask for help**:
   - Provide full error message
   - Include relevant logs
   - Describe steps to reproduce
   - Mention what you've already tried

---

**Last Updated**: 2026-02-17
**Version**: 1.0
