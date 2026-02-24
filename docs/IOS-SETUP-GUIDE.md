# iOS Setup Guide - PillSathi

Complete guide for setting up the PillSathi iOS app with Firebase integration.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Configuration](#firebase-configuration)
3. [Project Configuration](#project-configuration)
4. [CocoaPods Setup](#cocoapods-setup)
5. [Environment Setup](#environment-setup)
6. [Building the App](#building-the-app)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **macOS**: 12+ (Monterey or later)
- **Xcode**: 14+ (verify with `xcodebuild -version`)
- **Command Line Tools**: Latest version
- **Node.js**: 18+ (verify with `node --version`)
- **npm** or **yarn**: Latest version
- **Ruby**: 2.7+ (verify with `ruby --version`)
- **CocoaPods**: 1.11+ (verify with `pod --version`)
- **Homebrew**: Latest version (recommended)

### System Requirements

- **Disk Space**: At least 20GB free for Xcode and simulators
- **RAM**: 8GB minimum, 16GB recommended
- **iOS Deployment Target**: iOS 14.0+

### Installing Prerequisites

#### 1. Install Xcode

Download from the Mac App Store or [Apple Developer](https://developer.apple.com/xcode/).

After installation:

```bash
# Install Command Line Tools
xcode-select --install

# Accept license
sudo xcodebuild -license accept

# Verify installation
xcodebuild -version
```

#### 2. Install Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 3. Install Ruby (if needed)

macOS comes with Ruby, but you may want a newer version:

```bash
# Check current version
ruby --version

# Install via Homebrew (optional)
brew install ruby

# Add to PATH (add to ~/.zshrc)
export PATH="/usr/local/opt/ruby/bin:$PATH"
```

#### 4. Install CocoaPods

```bash
# Using system Ruby
sudo gem install cocoapods

# Or using Homebrew Ruby
gem install cocoapods

# Verify installation
pod --version
```

#### 5. Install Bundler

```bash
sudo gem install bundler

# Verify installation
bundle --version
```

---

## Firebase Configuration

### 1. Register iOS App in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`pillsathi-dev` or `pillsathi-prod`)
3. Click the gear icon ⚙️ > **Project settings**
4. Scroll to **Your apps** section
5. Click the **iOS icon** to add an iOS app

### 2. Enter App Details

- **Bundle ID**: `com.pillsaathi`
  - ⚠️ Must match exactly (defined in Xcode project)
  - Cannot be changed later
  - Find in Xcode: Select target > General > Bundle Identifier
- **App nickname**: `PillSathi Dev iOS` (or `PillSathi Prod iOS`)
- **App Store ID**: Optional (leave blank for now)

### 3. Download Configuration File

1. Download `GoogleService-Info.plist`
2. **Important**: Keep this file secure, it contains API keys

### 4. Add Configuration File to Xcode

**Method 1: Drag and Drop (Recommended)**

1. Open `ios/PillSaathi.xcworkspace` in Xcode (not `.xcodeproj`)
2. In Project Navigator, right-click on `PillSaathi` folder
3. Select **Add Files to "PillSaathi"...**
4. Navigate to and select `GoogleService-Info.plist`
5. **Important**: Check "Copy items if needed"
6. **Important**: Ensure "PillSaathi" target is selected
7. Click **Add**

**Method 2: Manual Copy**

```bash
# Copy file to iOS directory
cp /path/to/GoogleService-Info.plist ios/PillSaathi/

# Then add to Xcode project using Method 1
```

### 5. Verify Configuration

In Xcode Project Navigator:

- `GoogleService-Info.plist` should appear under `PillSaathi` folder
- File should have a target membership checkbox checked for `PillSaathi`

Open the file and verify:

```xml
<key>BUNDLE_ID</key>
<string>com.pillsaathi</string>
<key>PROJECT_ID</key>
<string>pillsathi-dev</string>
```

---

## Project Configuration

### 1. Podfile Configuration

Located at: `ios/Podfile`

**Key configurations:**

```ruby
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '14.0'

target 'PillSaathi' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true
  )

  # Firebase pods (automatically linked via autolinking)
  # No manual pod entries needed for @react-native-firebase packages

  # Notifee
  pod 'RNNotifee', :path => '../node_modules/@notifee/react-native'

  # React Native Config
  pod 'react-native-config', :path => '../node_modules/react-native-config'

  post_install do |installer|
    react_native_post_install(installer)
  end
end
```

### 2. Info.plist Configuration

Located at: `ios/PillSaathi/Info.plist`

**Required entries:**

```xml
<!-- App Transport Security -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
</dict>

<!-- Location (if needed for future features) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>PillSathi needs your location to find nearby pharmacies</string>

<!-- Notifications -->
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>

<!-- Camera (if needed for future features) -->
<key>NSCameraUsageDescription</key>
<string>PillSathi needs camera access to scan prescriptions</string>

<!-- Photo Library (if needed) -->
<key>NSPhotoLibraryUsageDescription</key>
<string>PillSathi needs photo access to attach prescription images</string>
```

### 3. Xcode Project Settings

Open `ios/PillSaathi.xcworkspace` in Xcode:

#### General Tab

- **Display Name**: PillSathi Dev (or PillSathi)
- **Bundle Identifier**: com.pillsaathi
- **Version**: 1.0
- **Build**: 1
- **Deployment Target**: iOS 14.0

#### Signing & Capabilities

**For Development:**

1. Select **Automatically manage signing**
2. Select your **Team** (Apple Developer account)
3. Xcode will create a development provisioning profile

**Required Capabilities:**

1. **Push Notifications**

   - Click **+ Capability**
   - Add **Push Notifications**

2. **Background Modes**
   - Click **+ Capability**
   - Add **Background Modes**
   - Check **Remote notifications**

#### Build Settings

Key settings to verify:

- **Enable Bitcode**: No (React Native doesn't support it)
- **Dead Code Stripping**: Yes
- **Strip Debug Symbols During Copy**: Yes (Release only)

---

## CocoaPods Setup

### 1. Install Bundler Dependencies

```bash
cd ios
bundle install
cd ..
```

This installs the specific CocoaPods version defined in `Gemfile`.

### 2. Install Pods

```bash
cd ios
bundle exec pod install
cd ..
```

**Expected output:**

```
Analyzing dependencies
Downloading dependencies
Installing [various pods]...
Generating Pods project
Integrating client project

[!] Please close any current Xcode sessions and use `PillSaathi.xcworkspace` for this project from now on.
```

### 3. Verify Pod Installation

```bash
cd ios
ls -la Pods/
```

Should see directories for:

- `RNFBApp` (Firebase App)
- `RNFBAuth` (Firebase Auth)
- `RNFBFirestore` (Firebase Firestore)
- `RNFBMessaging` (Firebase Messaging)
- `RNNotifee` (Notifee)
- `react-native-config`
- Many other React Native dependencies

### 4. Common Pod Issues

**Issue**: Pod install fails with dependency conflicts

**Solution**:

```bash
cd ios
rm -rf Pods
rm Podfile.lock
bundle exec pod install --repo-update
cd ..
```

**Issue**: "Unable to find a specification for..."

**Solution**:

```bash
pod repo update
cd ios
bundle exec pod install
cd ..
```

---

## Environment Setup

### 1. Create Environment Files

Create `.env.development` in project root:

```bash
# Environment
ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=pillsathi-dev
FIREBASE_IOS_APP_ID=your-ios-app-id
FIREBASE_IOS_API_KEY=your-ios-api-key

# App Configuration
APP_NAME=PillSathi Dev
ENABLE_DEBUG_LOGS=true
```

### 2. Get Firebase Values

From `GoogleService-Info.plist`:

- **FIREBASE_PROJECT_ID**: Value of `PROJECT_ID` key
- **FIREBASE_IOS_APP_ID**: Value of `GOOGLE_APP_ID` key
- **FIREBASE_IOS_API_KEY**: Value of `API_KEY` key

### 3. Configure react-native-config for iOS

Add a build phase script in Xcode:

1. Open `ios/PillSaathi.xcworkspace` in Xcode
2. Select **PillSaathi** project in navigator
3. Select **PillSaathi** target
4. Go to **Build Phases** tab
5. Click **+** > **New Run Script Phase**
6. Name it: "Load Environment Variables"
7. Add this script:

```bash
# Type a script or drag a script file from your workspace to insert its path.
echo "Loading environment variables from ${ENVFILE:-.env.development}"
"${SRCROOT}/../node_modules/react-native-config/ios/ReactNativeConfig/BuildXCConfig.rb" "${SRCROOT}/.." "${SRCROOT}/tmp.xcconfig"
```

8. Drag this phase to be **before** "Compile Sources"

### 4. Verify Environment Loading

Build the app and check console for environment variables being loaded.

---

## Building the App

### 1. Install Dependencies

```bash
# Install npm packages
npm install

# Install pods
cd ios
bundle install
bundle exec pod install
cd ..
```

### 2. Open Workspace in Xcode

**Important**: Always open the `.xcworkspace` file, not `.xcodeproj`

```bash
open ios/PillSaathi.xcworkspace
```

Or double-click `ios/PillSaathi.xcworkspace` in Finder.

### 3. Select Target Device

In Xcode toolbar:

- Select a simulator (e.g., iPhone 15 Pro)
- Or select your connected physical device

### 4. Build for Simulator

**Option 1: From Xcode**

1. Select a simulator from device dropdown
2. Press **⌘R** or click the Play button
3. Wait for build to complete
4. App will launch in simulator

**Option 2: From Command Line**

```bash
# Build and run on default simulator
npm run ios

# Build for specific simulator
npm run ios -- --simulator="iPhone 15 Pro"

# List available simulators
xcrun simctl list devices
```

### 5. Build for Physical Device

**Prerequisites:**

- Apple Developer account (free or paid)
- Device connected via USB
- Device registered in Apple Developer portal (automatic with Xcode)

**Steps:**

1. Connect your iPhone/iPad via USB
2. Trust the computer on your device (if prompted)
3. In Xcode, select your device from device dropdown
4. Ensure signing is configured (Signing & Capabilities tab)
5. Press **⌘R** to build and run
6. On first run, you may need to trust the developer certificate on device:
   - Settings > General > VPN & Device Management
   - Trust your developer certificate

### 6. Build Configurations

**Debug Build** (default):

- Includes debugging symbols
- Connects to Metro bundler
- Slower performance
- Larger app size

```bash
npm run ios
```

**Release Build**:

- Optimized for performance
- Smaller app size
- No debugging symbols
- Bundle is embedded in app

In Xcode:

1. Select **Product > Scheme > Edit Scheme**
2. Select **Run** in sidebar
3. Change **Build Configuration** to **Release**
4. Click **Close**
5. Build and run (**⌘R**)

### 7. Clean Build

If you encounter build issues:

**Option 1: Xcode**

- **Product > Clean Build Folder** (⇧⌘K)

**Option 2: Command Line**

```bash
cd ios
xcodebuild clean
rm -rf ~/Library/Developer/Xcode/DerivedData/*
bundle exec pod install
cd ..
```

**Option 3: Complete Clean**

```bash
# Clean everything
cd ios
rm -rf Pods
rm Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/*
bundle exec pod install
cd ..

# Restart Metro
npm start -- --reset-cache
```

---

## Testing

### 1. Verify Build

In Xcode:

1. Select a simulator
2. Press **⌘B** to build (without running)
3. Check for build errors in Issue Navigator (⌘5)

Expected: Build succeeds with no errors

### 2. Run on Simulator

```bash
npm run ios
```

Expected:

- Metro bundler starts
- App builds successfully
- Simulator launches
- App opens and displays splash screen

### 3. Check Logs

**In Xcode:**

- Open Debug Area (⌘⇧Y)
- Check console for Firebase initialization messages
- Look for any errors or warnings

**In Terminal:**

```bash
# View all logs
xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "PillSaathi"'

# View Firebase logs only
xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "PillSaathi"' | grep -i firebase
```

### 4. Test Firebase Connection

Run the app and verify:

- App launches without crashes
- Firebase services initialize
- No connection errors in console
- Can navigate between screens

Run verification script:

```bash
node scripts/verify-firebase-dev-connection.js
```

### 5. Test on Physical Device

1. Connect device via USB
2. Select device in Xcode
3. Build and run (**⌘R**)
4. Verify app launches
5. Check for any device-specific issues

### 6. Test Navigation

- Navigate between screens
- Verify back navigation works
- Check for any navigation errors
- Test tab navigation (if implemented)

---

## Troubleshooting

### Build Errors

#### Error: "No such module 'Firebase'"

**Solution:**

```bash
cd ios
rm -rf Pods
rm Podfile.lock
bundle exec pod install
cd ..
```

Then clean build in Xcode (⇧⌘K) and rebuild.

#### Error: "Command PhaseScriptExecution failed"

**Solution:**

1. Check the script that failed in Build Phases
2. Verify paths are correct
3. Ensure node_modules are installed
4. Try cleaning and rebuilding

#### Error: "Cycle in dependencies"

**Solution:**

1. In Xcode, go to **File > Workspace Settings**
2. Change **Build System** to **Legacy Build System**
3. Clean and rebuild

Or:

```bash
cd ios
rm -rf Pods
rm Podfile.lock
bundle exec pod deintegrate
bundle exec pod install
cd ..
```

### CocoaPods Errors

#### Error: "Unable to find a specification for..."

**Solution:**

```bash
pod repo update
cd ios
bundle exec pod install
cd ..
```

#### Error: "The sandbox is not in sync with the Podfile.lock"

**Solution:**

```bash
cd ios
bundle exec pod install
cd ..
```

#### Error: Pod install hangs or is very slow

**Solution:**

```bash
# Update CocoaPods
sudo gem install cocoapods

# Clear cache
pod cache clean --all

# Reinstall
cd ios
rm -rf Pods
rm Podfile.lock
bundle exec pod install
cd ..
```

### Signing Errors

#### Error: "Signing for 'PillSaathi' requires a development team"

**Solution:**

1. Open Xcode
2. Go to **Preferences > Accounts**
3. Add your Apple ID
4. In project settings, select your team under Signing & Capabilities

#### Error: "No profiles for 'com.pillsaathi' were found"

**Solution:**

1. Enable **Automatically manage signing** in Xcode
2. Xcode will create a provisioning profile automatically
3. If using manual signing, create a profile in Apple Developer portal

#### Error: "The executable was signed with invalid entitlements"

**Solution:**

1. Check that capabilities in Xcode match your provisioning profile
2. Regenerate provisioning profile if needed
3. Clean build folder and rebuild

### Runtime Errors

#### Firebase not connecting

**Check:**

1. `GoogleService-Info.plist` is in correct location
2. File is added to Xcode project with target membership
3. Environment variables are loaded correctly
4. Firebase services are enabled in Firebase Console
5. Internet connection is available

**Debug:**

```bash
# View logs
xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "PillSaathi"' | grep -i firebase
```

#### App crashes on launch

**Check:**

1. Build logs for errors
2. Console logs for crash details
3. Verify all dependencies are installed
4. Check Info.plist for required keys

**Debug:**

- Open Debug Navigator in Xcode (⌘7)
- Check crash logs
- Look for exception messages

#### Environment variables not loading

**Solution:**

1. Verify `.env.development` exists in project root
2. Check build phase script is configured correctly
3. Verify script runs before "Compile Sources"
4. Clean and rebuild:
   ```bash
   cd ios
   xcodebuild clean
   cd ..
   npm start -- --reset-cache
   ```

### Simulator Issues

#### Simulator won't boot

**Solution:**

```bash
# Reset simulator
xcrun simctl erase all

# Or reset specific simulator
xcrun simctl erase "iPhone 15 Pro"
```

#### App not installing on simulator

**Solution:**

```bash
# Delete app from simulator
xcrun simctl uninstall booted com.pillsaathi

# Reinstall
npm run ios
```

#### Simulator is slow

**Solution:**

1. Close other applications
2. Allocate more resources to simulator in Xcode
3. Use a simpler device (e.g., iPhone SE instead of iPhone 15 Pro Max)
4. Restart simulator

### Performance Issues

#### Slow build times

**Solutions:**

1. **Enable Hermes** (already enabled in Podfile)

2. **Use Xcode build cache**:

   - File > Workspace Settings
   - Enable "Shared Workspace Settings"

3. **Increase Xcode memory**:

   - Close other applications
   - Restart Xcode

4. **Use incremental builds**:
   - Don't clean unless necessary
   - Let Xcode cache work

#### Large app size

**Current size**: ~50-100 MB (debug build)

**To reduce**:

1. Use Release build configuration
2. Enable bitcode (if supported)
3. Remove unused resources
4. Use App Thinning for distribution

---

## Common Commands

```bash
# Install pods
cd ios && bundle exec pod install && cd ..

# Update pods
cd ios && bundle exec pod update && cd ..

# Clean pods
cd ios && rm -rf Pods && rm Podfile.lock && bundle exec pod install && cd ..

# Build and run on simulator
npm run ios

# Build for specific simulator
npm run ios -- --simulator="iPhone 15 Pro"

# List simulators
xcrun simctl list devices

# Clean build
cd ios && xcodebuild clean && cd ..

# Delete DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# View logs
xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "PillSaathi"'

# Reset simulator
xcrun simctl erase all

# Uninstall app from simulator
xcrun simctl uninstall booted com.pillsaathi
```

---

## Verification Checklist

After completing setup, verify:

- [ ] Xcode 14+ installed and configured
- [ ] Command Line Tools installed
- [ ] CocoaPods installed
- [ ] Firebase project created
- [ ] iOS app registered in Firebase
- [ ] `GoogleService-Info.plist` downloaded and added to Xcode
- [ ] `.env.development` file created with Firebase config
- [ ] Dependencies installed (`npm install`)
- [ ] Pods installed (`bundle exec pod install`)
- [ ] Workspace opens in Xcode without errors
- [ ] Build succeeds in Xcode
- [ ] App runs on simulator
- [ ] Firebase connection established
- [ ] Navigation works correctly
- [ ] No errors in console logs

---

## Next Steps

After iOS setup is complete:

1. **Test on Physical Device**: Build and test on actual iPhone/iPad
2. **Production Environment**: Set up `.env.production` and prod Firebase
3. **Authentication**: Implement phone OTP login (Phase 1)
4. **Push Notifications**: Configure APNs and test notifications
5. **App Store Preparation**: Configure signing for distribution

---

## Additional Resources

- [React Native iOS Setup](https://reactnative.dev/docs/environment-setup)
- [Firebase iOS Setup](https://firebase.google.com/docs/ios/setup)
- [React Native Firebase](https://rnfirebase.io/)
- [CocoaPods Guide](https://guides.cocoapods.org/)
- [Xcode Documentation](https://developer.apple.com/documentation/xcode)
- [Apple Developer Portal](https://developer.apple.com/)

---

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review Firebase Console for configuration issues
3. Check Xcode console for runtime errors
4. Consult React Native Firebase documentation
5. Review Apple Developer documentation

---

**Last Updated**: 2026-02-17
**Version**: 1.0
