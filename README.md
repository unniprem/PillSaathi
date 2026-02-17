This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Prerequisites

Before running the app, ensure you have:

- Node.js 18+ installed
- React Native development environment set up
- Android Studio (for Android development)
- Xcode 14+ (for iOS development, macOS only)
- Firebase account with billing enabled

## Environment Setup

### System Requirements

**Operating System:**

- macOS 12+ (required for iOS development)
- Windows 10+ or Linux (for Android development only)

**Development Tools:**

- Node.js 18+ and npm 8+
- Git
- Watchman (recommended for macOS/Linux)
- JDK 17 (for Android)
- Ruby 2.7+ (for iOS CocoaPods)

### Installing Development Tools

#### macOS

1. **Install Homebrew** (if not already installed):

   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Node.js and Watchman**:

   ```bash
   brew install node
   brew install watchman
   ```

3. **Install Ruby** (if needed):

   ```bash
   brew install ruby
   ```

4. **Install CocoaPods**:

   ```bash
   sudo gem install cocoapods
   ```

5. **Install Android Studio**:

   - Download from [developer.android.com](https://developer.android.com/studio)
   - Install Android SDK (API 33+)
   - Configure ANDROID_HOME environment variable:
     ```bash
     # Add to ~/.zshrc or ~/.bash_profile
     export ANDROID_HOME=$HOME/Library/Android/sdk
     export PATH=$PATH:$ANDROID_HOME/emulator
     export PATH=$PATH:$ANDROID_HOME/platform-tools
     ```

6. **Install Xcode**:
   - Download from Mac App Store
   - Install Command Line Tools:
     ```bash
     xcode-select --install
     ```
   - Accept license:
     ```bash
     sudo xcodebuild -license
     ```

#### Windows

1. **Install Node.js**:

   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **Install JDK 17**:

   - Download from [Oracle](https://www.oracle.com/java/technologies/downloads/) or use OpenJDK
   - Set JAVA_HOME environment variable

3. **Install Android Studio**:
   - Download from [developer.android.com](https://developer.android.com/studio)
   - Install Android SDK (API 33+)
   - Configure ANDROID_HOME environment variable

#### Linux

1. **Install Node.js**:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install Watchman**:

   ```bash
   # Follow instructions at https://facebook.github.io/watchman/docs/install
   ```

3. **Install JDK 17**:

   ```bash
   sudo apt-get install openjdk-17-jdk
   ```

4. **Install Android Studio**:
   - Download from [developer.android.com](https://developer.android.com/studio)
   - Follow Linux installation instructions

### Project Setup

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd PillSathi
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   Create `.env.development` in the project root:

   ```env
   ENV=development
   FIREBASE_PROJECT_ID=pillsathi-dev
   FIREBASE_API_KEY=your_dev_api_key
   FIREBASE_AUTH_DOMAIN=pillsathi-dev.firebaseapp.com
   FIREBASE_STORAGE_BUCKET=pillsathi-dev.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=your_dev_sender_id
   FIREBASE_APP_ID=your_dev_app_id
   ```

   Create `.env.production` in the project root:

   ```env
   ENV=production
   FIREBASE_PROJECT_ID=pillsathi-prod
   FIREBASE_API_KEY=your_prod_api_key
   FIREBASE_AUTH_DOMAIN=pillsathi-prod.firebaseapp.com
   FIREBASE_STORAGE_BUCKET=pillsathi-prod.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=your_prod_sender_id
   FIREBASE_APP_ID=your_prod_app_id
   ```

   **Note**: Never commit `.env` files to version control. They are already in `.gitignore`.

4. **Platform-specific setup**:

   **For iOS** (macOS only):

   ```bash
   cd ios
   bundle install
   bundle exec pod install
   cd ..
   ```

   **For Android**:

   - Ensure Android emulator is set up or device is connected
   - Verify with: `adb devices`

### Environment Variables Reference

| Variable                       | Description                 | Example                             |
| ------------------------------ | --------------------------- | ----------------------------------- |
| `ENV`                          | Environment name            | `development` or `production`       |
| `FIREBASE_PROJECT_ID`          | Firebase project identifier | `pillsathi-dev`                     |
| `FIREBASE_API_KEY`             | Firebase API key            | `AIza...`                           |
| `FIREBASE_AUTH_DOMAIN`         | Firebase auth domain        | `pillsathi-dev.firebaseapp.com`     |
| `FIREBASE_STORAGE_BUCKET`      | Firebase storage bucket     | `pillsathi-dev.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID               | `123456789`                         |
| `FIREBASE_APP_ID`              | Firebase app ID             | `1:123:android:abc`                 |

### Switching Environments

The app uses `react-native-config` to manage environment variables. By default, it uses `.env.development`.

To build with production environment:

**Android**:

```bash
ENVFILE=.env.production npm run android
```

**iOS**:

```bash
ENVFILE=.env.production npm run ios
```

### Verifying Your Setup

After completing the setup, verify everything is working:

1. **Check Node.js and npm**:

   ```bash
   node --version  # Should be 18+
   npm --version   # Should be 8+
   ```

2. **Check React Native CLI**:

   ```bash
   npx react-native --version
   ```

3. **Check Android setup** (if applicable):

   ```bash
   echo $ANDROID_HOME  # Should show Android SDK path
   adb devices         # Should list connected devices/emulators
   ```

4. **Check iOS setup** (macOS only):

   ```bash
   xcodebuild -version  # Should show Xcode version
   pod --version        # Should show CocoaPods version
   ```

5. **Verify Firebase connection**:
   ```bash
   node scripts/verify-firebase-dev-connection.js
   ```

If all checks pass, you're ready to run the app!

## Firebase Setup

PillSathi uses Firebase for authentication, database, and cloud messaging. Complete the [Environment Setup](#environment-setup) section first, then configure Firebase.

### Quick Setup

1. **Create Firebase Projects**

   - Development: `pillsathi-dev`
   - Production: `pillsathi-prod`
   - Visit [Firebase Console](https://console.firebase.google.com/)

2. **Enable Firebase Services**

   In each project, enable:

   - Authentication (Phone provider)
   - Firestore Database (start in test mode)
   - Cloud Messaging

3. **Register Your Apps**

   **For Android:**

   - Register app with package name: `com.pillsaathi`
   - Download `google-services.json`
   - Place at: `android/app/google-services.json`

   **For iOS:**

   - Register app with bundle ID: `com.pillsaathi`
   - Download `GoogleService-Info.plist`
   - Place at: `ios/PillSaathi/GoogleService-Info.plist`
   - Add to Xcode project

4. **Configure Environment Variables**

   Environment variables are already configured in the [Environment Setup](#environment-setup) section. Ensure you have:

   - `.env.development` with dev Firebase credentials
   - `.env.production` with prod Firebase credentials

### Detailed Setup Guides

For comprehensive Firebase setup instructions, see:

- **[Firebase Setup Guide](FIREBASE-SETUP-GUIDE.md)** - Complete Firebase configuration for all phases
- **[Firebase Android Registration](FIREBASE-ANDROID-REGISTRATION.md)** - Step-by-step Android app registration
- **[Firebase Dev Connection Verification](docs/FIREBASE-DEV-CONNECTION-VERIFICATION.md)** - Verify your Firebase connection

### Verify Firebase Connection

After setup, verify your Firebase connection:

```bash
# Run verification script
node scripts/verify-firebase-dev-connection.js

# Run connection tests
npm test -- __tests__/firebaseConnection.test.js
```

Expected output: All checks should pass with green checkmarks ✅

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Building the App

### Android Builds

#### Debug Build

Build a debug APK for testing:

```bash
cd android
./gradlew assembleDebug
cd ..
```

The APK will be located at: `android/app/build/outputs/apk/debug/app-debug.apk`

Install the debug APK on a connected device:

```bash
cd android
./gradlew installDebug
cd ..
```

#### Release Build

Build a release APK for distribution:

```bash
cd android
./gradlew assembleRelease
cd ..
```

The APK will be located at: `android/app/build/outputs/apk/release/app-release.apk`

**Note**: Release builds require signing configuration. See [Android Signing Guide](https://reactnative.dev/docs/signed-apk-android) for setup.

#### Build with Production Environment

To build with production Firebase configuration:

```bash
cd android
ENVFILE=.env.production ./gradlew assembleDebug
cd ..
```

#### Clean Build

If you encounter build issues, perform a clean build:

```bash
cd android
./gradlew clean
./gradlew assembleDebug
cd ..
```

#### Build from Android Studio

1. Open `android/` folder in Android Studio
2. Wait for Gradle sync to complete
3. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**
4. APK will be generated in `app/build/outputs/apk/`

### iOS Builds

#### Debug Build

Build for iOS Simulator:

```bash
# Ensure pods are installed
cd ios
bundle exec pod install
cd ..

# Build and run on simulator
npm run ios
```

Build for a specific simulator:

```bash
npm run ios -- --simulator="iPhone 15 Pro"
```

#### Release Build

Build a release version from Xcode:

1. Open `ios/PillSaathi.xcworkspace` in Xcode (not `.xcodeproj`)
2. Select **Product > Scheme > Edit Scheme**
3. Change **Build Configuration** to **Release**
4. Select your target device or "Any iOS Device"
5. Select **Product > Build** (⌘B)

#### Build for Physical Device

1. Connect your iOS device via USB
2. Open `ios/PillSaathi.xcworkspace` in Xcode
3. Select your device from the device dropdown
4. Ensure your Apple Developer account is configured in Xcode
5. Select **Product > Run** (⌘R)

**Note**: You need an Apple Developer account to run on physical devices.

#### Build with Production Environment

To build with production Firebase configuration:

```bash
ENVFILE=.env.production npm run ios
```

Or in Xcode:

1. Open `ios/PillSaathi.xcworkspace`
2. Select **Product > Scheme > Edit Scheme**
3. Under **Run > Arguments**, add environment variable:
   - Name: `ENVFILE`
   - Value: `.env.production`
4. Build and run

#### Clean Build

If you encounter build issues:

```bash
# Clean iOS build
cd ios
xcodebuild clean
rm -rf ~/Library/Developer/Xcode/DerivedData/*
bundle exec pod install
cd ..
```

Or in Xcode: **Product > Clean Build Folder** (⇧⌘K)

### Build Scripts

The project includes npm scripts for common build tasks:

```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format

# Clean Android build
npm run clean:android

# Clean iOS build
npm run clean:ios

# View Android logs
npm run log:android

# View iOS logs
npm run log:ios
```

### Build Verification

After building, verify the app works correctly:

1. **Launch the app** on device/emulator
2. **Check Firebase connection**: The app should connect to Firebase without errors
3. **Test navigation**: Navigate between screens to ensure navigation works
4. **Check logs**: Look for any errors or warnings in the console
5. **Verify environment**: Ensure the correct Firebase environment (dev/prod) is active

Run the verification script:

```bash
node scripts/verify-firebase-dev-connection.js
```

### Common Build Issues

#### Android Build Fails

**Issue**: Gradle build fails with dependency errors

**Solution**:

```bash
cd android
./gradlew clean
./gradlew --refresh-dependencies
cd ..
```

**Issue**: "SDK location not found"

**Solution**: Ensure `ANDROID_HOME` is set correctly in your environment variables.

#### iOS Build Fails

**Issue**: "No such module" errors

**Solution**:

```bash
cd ios
bundle exec pod deintegrate
bundle exec pod install
cd ..
```

**Issue**: Code signing errors

**Solution**: Configure your Apple Developer account in Xcode under **Preferences > Accounts**.

#### Metro Bundler Issues

**Issue**: Metro bundler cache issues

**Solution**:

```bash
npm start -- --reset-cache
```

For more troubleshooting, see the [Troubleshooting](#troubleshooting) section.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

This section covers common issues you might encounter while developing PillSathi and their solutions.

## Quick Diagnostics

Before diving into specific issues, run these diagnostic commands:

```bash
# Check Node.js and npm versions
node --version  # Should be 18+
npm --version   # Should be 8+

# Verify Firebase connection
node scripts/verify-firebase-dev-connection.js

# Run connection tests
npm test -- __tests__/firebaseConnection.test.js

# Check for package issues
npm list --depth=0
```

## General Issues

### Metro Bundler Won't Start

**Symptoms**: Metro fails to start or crashes immediately

**Solutions**:

1. **Clear Metro cache**:

   ```bash
   npm start -- --reset-cache
   ```

2. **Check for port conflicts** (Metro uses port 8081):

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

4. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules
   npm install
   ```

### App Won't Launch

**Symptoms**: App builds successfully but crashes on launch or shows blank screen

**Solutions**:

1. **Check Metro bundler is running**:

   ```bash
   npm start
   ```

2. **Verify environment variables are loaded**:

   - Check `.env.development` exists
   - Verify all required variables are set
   - Rebuild the app after changing env files

3. **Check for JavaScript errors**:

   - Open React Native debugger
   - Check console for errors
   - Look for red screen errors on device

4. **Clear app data** (Android):

   ```bash
   adb shell pm clear com.pillsaathi
   ```

5. **Delete and reinstall app** (iOS):
   - Delete app from simulator/device
   - Rebuild and install

### Fast Refresh Not Working

**Symptoms**: Changes to code don't reflect in the app

**Solutions**:

1. **Enable Fast Refresh**:

   - Shake device or press Cmd+M (Android) / Cmd+D (iOS)
   - Enable "Fast Refresh" in Dev Menu

2. **Reload manually**:

   - Press 'R' twice in terminal where Metro is running
   - Or reload from Dev Menu

3. **Restart Metro with cache reset**:
   ```bash
   npm start -- --reset-cache
   ```

### Module Not Found Errors

**Symptoms**: `Unable to resolve module` or `Module does not exist` errors

**Solutions**:

1. **Verify module is installed**:

   ```bash
   npm list <module-name>
   ```

2. **Reinstall dependencies**:

   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Clear Metro cache**:

   ```bash
   npm start -- --reset-cache
   ```

4. **Check import paths**:
   - Verify relative paths are correct
   - Check for typos in import statements

## Android Issues

### Build Failures

**Issue**: Gradle build fails with various errors

**Solutions**:

1. **Clean build**:

   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug
   cd ..
   ```

2. **Clear Gradle cache**:

   ```bash
   cd android
   ./gradlew clean
   ./gradlew --refresh-dependencies
   cd ..
   ```

3. **Delete build folders**:

   ```bash
   cd android
   rm -rf app/build
   rm -rf build
   ./gradlew assembleDebug
   cd ..
   ```

4. **Check Gradle daemon**:
   ```bash
   cd android
   ./gradlew --stop
   ./gradlew assembleDebug
   cd ..
   ```

### SDK Location Not Found

**Symptoms**: `SDK location not found. Define location with sdk.dir...`

**Solutions**:

1. **Set ANDROID_HOME environment variable**:

   ```bash
   # Add to ~/.zshrc or ~/.bash_profile
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

2. **Create local.properties** (if missing):

   ```bash
   # In android/ directory
   echo "sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk" > local.properties
   ```

3. **Verify Android SDK is installed**:
   - Open Android Studio
   - Go to Preferences > Appearance & Behavior > System Settings > Android SDK
   - Ensure SDK is installed

### App Not Installing on Device

**Symptoms**: Build succeeds but app doesn't install on device/emulator

**Solutions**:

1. **Check device connection**:

   ```bash
   adb devices
   ```

2. **Restart adb server**:

   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

3. **Uninstall existing app**:

   ```bash
   adb uninstall com.pillsaathi
   ```

4. **Check USB debugging is enabled** on device

5. **Try installing APK directly**:
   ```bash
   cd android
   ./gradlew installDebug
   cd ..
   ```

### Duplicate Class Errors

**Symptoms**: `Duplicate class found` errors during build

**Solutions**:

1. **Clean build**:

   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

2. **Check for duplicate dependencies** in `android/app/build.gradle`

3. **Clear Gradle cache**:
   ```bash
   rm -rf ~/.gradle/caches/
   ```

## iOS Issues

### Pod Install Fails

**Symptoms**: `pod install` fails with dependency errors

**Solutions**:

1. **Update CocoaPods**:

   ```bash
   sudo gem install cocoapods
   ```

2. **Clear CocoaPods cache**:

   ```bash
   cd ios
   rm -rf Pods
   rm Podfile.lock
   bundle exec pod install
   cd ..
   ```

3. **Deintegrate and reinstall**:

   ```bash
   cd ios
   bundle exec pod deintegrate
   bundle exec pod install
   cd ..
   ```

4. **Update pod repo**:
   ```bash
   pod repo update
   ```

### Build Fails in Xcode

**Symptoms**: Build fails with compilation errors in Xcode

**Solutions**:

1. **Clean build folder**:

   - In Xcode: Product > Clean Build Folder (⇧⌘K)
   - Or via command line:
     ```bash
     cd ios
     xcodebuild clean
     cd ..
     ```

2. **Delete DerivedData**:

   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData/*
   ```

3. **Reinstall pods**:

   ```bash
   cd ios
   rm -rf Pods
   bundle exec pod install
   cd ..
   ```

4. **Check Xcode version**:
   - Ensure you're using Xcode 14+
   - Update if necessary

### Code Signing Errors

**Symptoms**: Code signing fails or provisioning profile errors

**Solutions**:

1. **Configure Apple Developer account**:

   - Open Xcode
   - Go to Preferences > Accounts
   - Add your Apple ID

2. **Select development team**:

   - Open project in Xcode
   - Select target > Signing & Capabilities
   - Select your team

3. **Use automatic signing**:

   - Enable "Automatically manage signing"
   - Xcode will handle provisioning profiles

4. **For physical devices**:
   - Ensure device is registered in Apple Developer portal
   - Ensure provisioning profile includes the device

### App Not Running on Simulator

**Symptoms**: Build succeeds but app doesn't launch on simulator

**Solutions**:

1. **Reset simulator**:

   - Device > Erase All Content and Settings

2. **Restart simulator**:

   - Close and reopen simulator

3. **Check simulator is booted**:

   ```bash
   xcrun simctl list devices
   ```

4. **Try different simulator**:
   ```bash
   npm run ios -- --simulator="iPhone 15 Pro"
   ```

## Firebase Issues

### Firebase Not Initialized

**Symptoms**: Firebase services are undefined or app crashes on launch

**Solutions**:

1. **Verify configuration files exist**:

   - Android: `android/app/google-services.json`
   - iOS: `ios/PillSaathi/GoogleService-Info.plist`

2. **Check Firebase packages are installed**:

   ```bash
   npm list @react-native-firebase/app
   npm list @react-native-firebase/auth
   npm list @react-native-firebase/firestore
   ```

3. **Reinstall Firebase packages**:

   ```bash
   npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
   ```

4. **For Android**: Clean and rebuild

   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug
   cd ..
   ```

5. **For iOS**: Reinstall pods

   ```bash
   cd ios
   bundle exec pod install
   cd ..
   ```

6. **Verify Firebase initialization** in `src/config/firebase.js`

### Wrong Firebase Project

**Symptoms**: App connects to wrong environment (dev/prod)

**Solutions**:

1. **Check environment file**:

   - Verify `.env.development` has correct `FIREBASE_PROJECT_ID`
   - Compare with Firebase Console project ID

2. **Verify google-services.json**:

   - Open `android/app/google-services.json`
   - Check `project_id` matches expected environment

3. **Verify GoogleService-Info.plist** (iOS):

   - Open `ios/PillSaathi/GoogleService-Info.plist`
   - Check `PROJECT_ID` matches expected environment

4. **Rebuild with correct environment**:

   ```bash
   # For development
   npm run android

   # For production
   ENVFILE=.env.production npm run android
   ```

5. **Clear app data and reinstall**:
   - Android: `adb shell pm clear com.pillsaathi`
   - iOS: Delete app and reinstall

### Environment Variables Not Loading

**Symptoms**: Config values are undefined or null

**Solutions**:

1. **Verify react-native-config is installed**:

   ```bash
   npm list react-native-config
   ```

2. **Check .env file exists**:

   ```bash
   ls -la .env.development
   ```

3. **Verify .env file format**:

   - No spaces around `=`
   - No quotes around values (unless needed)
   - Example: `FIREBASE_PROJECT_ID=pillsathi-dev`

4. **For Android**: Check `android/app/build.gradle` has configuration:

   ```gradle
   project.ext.envConfigFiles = [
       debug: ".env.development",
       release: ".env.production"
   ]
   ```

5. **Clean and rebuild**:

   ```bash
   # Android
   cd android
   ./gradlew clean
   cd ..

   # iOS
   cd ios
   xcodebuild clean
   cd ..
   ```

6. **Restart Metro bundler**:
   ```bash
   npm start -- --reset-cache
   ```

### Firebase Connection Failed

**Symptoms**: Network errors or timeout when connecting to Firebase

**Solutions**:

1. **Check internet connection**:

   - Verify device/emulator has internet access
   - Try opening a website in browser

2. **Verify Firebase project is active**:

   - Open [Firebase Console](https://console.firebase.google.com/)
   - Check project exists and is not disabled

3. **Check Firebase service status**:

   - Visit [Firebase Status Dashboard](https://status.firebase.google.com/)

4. **Ensure billing is enabled**:

   - Some Firebase services require Blaze plan
   - Check Firebase Console > Settings > Usage and billing

5. **Run verification script**:

   ```bash
   node scripts/verify-firebase-dev-connection.js
   ```

6. **Check Firestore rules**:

   - Ensure rules allow read/write for testing
   - In Firebase Console > Firestore > Rules

7. **Verify API keys are correct**:
   - Check `.env.development` has correct `FIREBASE_API_KEY`
   - Compare with Firebase Console > Project Settings

### Firestore Permission Denied

**Symptoms**: `Missing or insufficient permissions` errors

**Solutions**:

1. **Check Firestore security rules**:

   - Open Firebase Console > Firestore > Rules
   - For development, use test mode rules:
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /{document=**} {
           allow read, write: if true;
         }
       }
     }
     ```
   - **Warning**: Test mode rules are insecure, only use in development

2. **Verify user is authenticated** (if rules require auth)

3. **Check rule syntax**:
   - Ensure rules are valid
   - Test rules in Firebase Console

### Firebase Authentication Errors

**Symptoms**: Auth methods fail or return errors

**Solutions**:

1. **Enable authentication provider**:

   - Open Firebase Console > Authentication > Sign-in method
   - Enable Phone provider

2. **Check API key restrictions**:

   - Firebase Console > Project Settings > API Keys
   - Ensure Android/iOS apps are allowed

3. **Verify SHA-1 fingerprint** (Android):

   - Get debug SHA-1:
     ```bash
     cd android
     ./gradlew signingReport
     cd ..
     ```
   - Add to Firebase Console > Project Settings > Your apps

4. **Check bundle ID / package name**:
   - Ensure it matches Firebase registration
   - Android: `com.pillsaathi`
   - iOS: `com.pillsaathi`

## Navigation Issues

### Navigation Not Working

**Symptoms**: Navigation functions throw errors or don't navigate

**Solutions**:

1. **Verify React Navigation is installed**:

   ```bash
   npm list @react-navigation/native
   npm list @react-navigation/native-stack
   ```

2. **Check NavigationContainer wraps app**:

   - Verify `App.js` has `<NavigationContainer>`

3. **Verify screen names match**:

   - Check navigation calls use correct screen names
   - Names are case-sensitive

4. **Check navigation prop is available**:
   - Ensure component is a screen in navigator
   - Or use `useNavigation()` hook

### Back Navigation Not Working

**Symptoms**: Back button doesn't work or navigates incorrectly

**Solutions**:

1. **Check navigation stack**:

   - Ensure screens are in a stack navigator
   - Verify navigation hierarchy

2. **Test hardware back button** (Android):

   - Should work automatically with stack navigator

3. **Check for navigation state issues**:

   - Clear navigation state persistence
   - Restart app

4. **See detailed guide**:
   - [Navigation Back Verification](NAVIGATION-BACK-VERIFICATION.md)

## Testing Issues

### Tests Failing

**Symptoms**: Jest tests fail with various errors

**Solutions**:

1. **Clear Jest cache**:

   ```bash
   npm test -- --clearCache
   ```

2. **Update snapshots** (if needed):

   ```bash
   npm test -- -u
   ```

3. **Run specific test file**:

   ```bash
   npm test -- __tests__/firebase.test.js
   ```

4. **Check test environment**:
   - Verify test dependencies are installed
   - Check Jest configuration in `package.json`

### Firebase Tests Failing

**Symptoms**: Firebase connection tests fail

**Solutions**:

1. **Verify .env.development exists**:

   ```bash
   cat .env.development
   ```

2. **Check Firebase credentials are correct**

3. **Run verification script**:

   ```bash
   node scripts/verify-firebase-dev-connection.js
   ```

4. **Check internet connection**

## Performance Issues

### App Running Slowly

**Symptoms**: App is laggy or unresponsive

**Solutions**:

1. **Enable Hermes** (if not already):

   - Check `android/app/build.gradle` has `enableHermes: true`
   - For iOS, check `ios/Podfile`

2. **Use production build**:

   - Debug builds are slower
   - Test with release build

3. **Check for console.log statements**:

   - Remove or disable in production
   - Use `__DEV__` flag

4. **Profile with React DevTools**:
   - Identify slow components
   - Optimize re-renders

### Large Bundle Size

**Symptoms**: App takes long to load or bundle is large

**Solutions**:

1. **Enable Hermes** for better performance

2. **Check for large dependencies**:

   ```bash
   npm list --depth=0
   ```

3. **Use production build**:

   - Production builds are optimized

4. **Analyze bundle**:
   - Use React Native bundle analyzer

## Getting More Help

If you're still experiencing issues:

1. **Check official documentation**:

   - [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)
   - [Firebase Documentation](https://firebase.google.com/docs)
   - [React Native Firebase](https://rnfirebase.io/)

2. **Check project-specific guides**:

   - [Firebase Setup Guide](FIREBASE-SETUP-GUIDE.md)
   - [Android Setup Guide](docs/ANDROID-SETUP-GUIDE.md)
   - [iOS Setup Guide](docs/IOS-SETUP-GUIDE.md)
   - [Common Issues and Solutions](docs/COMMON-ISSUES-AND-SOLUTIONS.md)
   - [Debugging Guide](docs/DEBUGGING-SETUP.md)

3. **Search for similar issues**:

   - GitHub Issues for React Native
   - Stack Overflow
   - React Native Firebase GitHub

4. **Enable verbose logging**:

   ```bash
   # Android
   adb logcat | grep -i firebase

   # iOS
   # Check Xcode console
   ```

5. **Create a minimal reproduction**:
   - Isolate the issue
   - Test in a fresh project
   - Report with details

# Debugging

For debugging the app, see our comprehensive debugging guides:

- **[Debugging Quick Start](docs/DEBUGGING-QUICK-START.md)** - Quick reference for common debugging tasks
- **[Debugging Setup Guide](docs/DEBUGGING-SETUP.md)** - Complete debugging setup and tools

Quick debugging commands:

```sh
# View Android logs
npm run log:android

# View iOS logs
npm run log:ios

# Clean build
npm run clean:android
npm run clean:ios
```

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

## Firebase Resources

- [Firebase Documentation](https://firebase.google.com/docs) - official Firebase documentation
- [React Native Firebase](https://rnfirebase.io/) - React Native Firebase library documentation
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started) - secure your database
- [Cloud Functions](https://firebase.google.com/docs/functions) - serverless backend functions
- [Firebase Console](https://console.firebase.google.com/) - manage your Firebase projects
