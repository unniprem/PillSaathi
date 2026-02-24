# Android Setup Guide - PillSathi

Complete guide for setting up the PillSathi Android app with Firebase integration.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Configuration](#firebase-configuration)
3. [Project Configuration](#project-configuration)
4. [Build Configuration](#build-configuration)
5. [Environment Setup](#environment-setup)
6. [Building the App](#building-the-app)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: 18+ (verify with `node --version`)
- **npm** or **yarn**: Latest version
- **Java Development Kit (JDK)**: 17 or 21
- **Android Studio**: Latest stable version
- **Android SDK**: API 26+ (Android 8.0+)
- **Android Build Tools**: 36.0.0

### Environment Variables

Ensure the following are set in your shell profile:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Verify with:

```bash
echo $ANDROID_HOME
adb --version
```

---

## Firebase Configuration

### 1. Register Android App in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`pillsathi-dev` or `pillsathi-prod`)
3. Click the gear icon ⚙️ > **Project settings**
4. Scroll to **Your apps** section
5. Click the **Android icon** to add an Android app

### 2. Enter App Details

- **Package name**: `com.pillsaathi`
  - ⚠️ Must match exactly (defined in `android/app/build.gradle`)
  - Cannot be changed later
- **App nickname**: `PillSathi Dev Android` (or `PillSathi Prod Android`)
- **SHA-1**: Optional for now (required for Google Sign-In)

### 3. Download Configuration File

1. Download `google-services.json`
2. Place it at: `android/app/google-services.json`

**Verify the file contains:**

```json
{
  "project_info": {
    "project_id": "pillsathi-dev",
    ...
  },
  "client": [{
    "client_info": {
      "android_client_info": {
        "package_name": "com.pillsaathi"
      }
    }
  }]
}
```

---

## Project Configuration

### 1. Root build.gradle

Located at: `android/build.gradle`

**Key configurations:**

```gradle
buildscript {
    ext {
        buildToolsVersion = "36.0.0"
        minSdkVersion = 24
        compileSdkVersion = 36
        targetSdkVersion = 36
        ndkVersion = "27.1.12297006"
        kotlinVersion = "2.1.20"
    }
    dependencies {
        classpath("com.google.gms:google-services:4.4.0")
    }
}
```

### 2. App build.gradle

Located at: `android/app/build.gradle`

**Package configuration:**

```gradle
android {
    namespace "com.pillsaathi"
    defaultConfig {
        applicationId "com.pillsaathi"
        minSdkVersion 24
        targetSdkVersion 36
        versionCode 1
        versionName "1.0"
    }
}
```

**Firebase dependencies:**

```gradle
dependencies {
    // Firebase BoM (Bill of Materials)
    implementation platform('com.google.firebase:firebase-bom:33.7.0')

    // Firebase services
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-auth'
    implementation 'com.google.firebase:firebase-firestore'
    implementation 'com.google.firebase:firebase-messaging'
}

// Must be at the bottom
apply plugin: 'com.google.gms.google-services'
```

**Environment configuration (react-native-config):**

```gradle
project.ext.envConfigFiles = [
    debug: ".env.development",
    release: ".env.production",
]
apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"
```

### 3. AndroidManifest.xml

Located at: `android/app/src/main/AndroidManifest.xml`

**Required permissions:**

```xml
<!-- Internet access -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Notifications -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Foreground services for alarms -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_HEALTH" />
```

---

## Build Configuration

### Debug Keystore

The project uses a debug keystore for development builds:

- **Location**: `android/app/debug.keystore`
- **Store Password**: `android`
- **Key Alias**: `androiddebugkey`
- **Key Password**: `android`

### Getting SHA-1 (for Firebase)

```bash
cd android
./gradlew signingReport
```

Look for SHA-1 under "Variant: debug" and add it to Firebase Console if needed.

---

## Environment Setup

### 1. Create Environment Files

Create `.env.development` in project root:

```bash
# Environment
ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=pillsathi-dev
FIREBASE_ANDROID_APP_ID=your-android-app-id
FIREBASE_ANDROID_API_KEY=your-android-api-key

# App Configuration
APP_NAME=PillSathi Dev
ENABLE_DEBUG_LOGS=true
```

### 2. Get Firebase Values

From `google-services.json`:

- **FIREBASE_PROJECT_ID**: `project_info.project_id`
- **FIREBASE_ANDROID_APP_ID**: `client[0].client_info.mobilesdk_app_id`
- **FIREBASE_ANDROID_API_KEY**: `client[0].api_key[0].current_key`

### 3. Verify Environment Loading

```bash
npm run android
# Check console for environment variables
```

---

## Building the App

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Clean Build (if needed)

```bash
cd android
./gradlew clean
cd ..
```

### 3. Build Debug APK

```bash
cd android
./gradlew assembleDebug
```

**Output location**: `android/app/build/outputs/apk/debug/app-debug.apk`

### 4. Build Release APK

```bash
cd android
./gradlew assembleRelease
```

**Output location**: `android/app/build/outputs/apk/release/app-release.apk`

### 5. Run on Device/Emulator

```bash
# From project root
npm run android
# or
yarn android
```

This will:

1. Start Metro bundler
2. Build the app
3. Install on connected device/emulator
4. Launch the app

---

## Testing

### 1. Verify Build

```bash
cd android
./gradlew assembleDebug
```

Expected: Build succeeds with no errors

### 2. Install on Device

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. Check Logs

```bash
adb logcat | grep -i firebase
```

Look for:

- Firebase initialization messages
- No connection errors
- Successful Firestore/Auth initialization

### 4. Test Firebase Connection

Run the app and check:

- App launches without crashes
- Firebase services initialize
- No errors in Metro bundler console

### 5. Test Navigation

- Navigate between screens
- Verify back button works
- Check for any navigation errors

---

## Troubleshooting

### Build Errors

#### Error: "google-services.json not found"

**Solution:**

```bash
# Verify file exists
ls -la android/app/google-services.json

# If missing, download from Firebase Console
```

#### Error: "Execution failed for task ':app:processDebugGoogleServices'"

**Solution:**

- Verify `google-services.json` has correct package name
- Check that package name matches `applicationId` in `build.gradle`

#### Error: "SDK location not found"

**Solution:**

```bash
# Create local.properties
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

### Runtime Errors

#### Firebase not connecting

**Check:**

1. `google-services.json` is in correct location
2. Environment variables are loaded correctly
3. Firebase services are enabled in Firebase Console
4. Internet permission is in AndroidManifest.xml

**Debug:**

```bash
adb logcat | grep -E "Firebase|GoogleServices"
```

#### App crashes on launch

**Check:**

1. Build logs for errors
2. Logcat for crash details
3. Verify all dependencies are installed

**Debug:**

```bash
adb logcat *:E
```

### Environment Issues

#### Environment variables not loading

**Solution:**

1. Verify `.env.development` exists
2. Check `build.gradle` has react-native-config configuration
3. Clean and rebuild:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug
   ```

#### Wrong Firebase project

**Solution:**

- Verify correct `.env` file is being used
- Check `FIREBASE_PROJECT_ID` matches Firebase Console
- Rebuild app after changing environment

### Performance Issues

#### Slow build times

**Solutions:**

1. Enable Gradle daemon:

   ```bash
   echo "org.gradle.daemon=true" >> android/gradle.properties
   ```

2. Increase heap size:

   ```bash
   echo "org.gradle.jvmargs=-Xmx4096m" >> android/gradle.properties
   ```

3. Use parallel builds:
   ```bash
   echo "org.gradle.parallel=true" >> android/gradle.properties
   ```

#### Large APK size

**Current size**: ~129 MB (debug build)

**To reduce:**

1. Enable Proguard for release builds
2. Use APK splits for different architectures
3. Remove unused resources

---

## Common Commands

```bash
# Clean build
cd android && ./gradlew clean && cd ..

# Build debug
cd android && ./gradlew assembleDebug && cd ..

# Build release
cd android && ./gradlew assembleRelease && cd ..

# Install debug APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Uninstall app
adb uninstall com.pillsaathi

# View logs
adb logcat

# View Firebase logs only
adb logcat | grep -i firebase

# List connected devices
adb devices

# Run app
npm run android
```

---

## Verification Checklist

After completing setup, verify:

- [ ] Android Studio installed and configured
- [ ] Android SDK and build tools installed
- [ ] ANDROID_HOME environment variable set
- [ ] Firebase project created
- [ ] Android app registered in Firebase
- [ ] `google-services.json` downloaded and placed correctly
- [ ] `.env.development` file created with Firebase config
- [ ] Dependencies installed (`npm install`)
- [ ] Debug build succeeds
- [ ] App installs on device/emulator
- [ ] App launches without crashes
- [ ] Firebase connection established
- [ ] Navigation works correctly
- [ ] No errors in logs

---

## Next Steps

After Android setup is complete:

1. **iOS Setup**: Follow iOS setup guide
2. **Authentication**: Implement phone OTP login (Phase 1)
3. **Testing**: Set up automated testing
4. **CI/CD**: Configure continuous integration

---

## Additional Resources

- [React Native Android Setup](https://reactnative.dev/docs/environment-setup)
- [Firebase Android Setup](https://firebase.google.com/docs/android/setup)
- [React Native Firebase](https://rnfirebase.io/)
- [Android Developer Guide](https://developer.android.com/guide)

---

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review Firebase Console for configuration issues
3. Check Android logcat for runtime errors
4. Consult React Native Firebase documentation

---

**Last Updated**: 2026-02-17
**Version**: 1.0
