# Phase 0: Foundation & Firebase Setup - Tasks

Version: 1.0
Date: 2026-02-16
Status: Not Started

---

## Task Overview

This task list covers Phase 0 implementation for the existing React Native app. Focus is on Firebase integration, JavaScript development, and navigation setup.

---

## 1. Firebase Project Setup

### 1.1 Create Firebase Projects

- [x] Create `pillsathi-dev` Firebase project
- [ ] Create `pillsathi-prod` Firebase project
- [x] Enable billing on both projects (required for Cloud Functions)

### 1.2 Enable Firebase Services

- [x] Enable Firebase Authentication (Phone provider) in dev project
- [ ] Enable Firebase Authentication (Phone provider) in prod project
- [x] Create Firestore database in dev project (test mode initially)
- [ ] Create Firestore database in prod project (test mode initially)
- [x] Enable Cloud Messaging in both projects

### 1.3 Register Apps

- [x] Register Android app in dev Firebase project
  - Package name: `com.pillsaathi` (or your actual package)
  - Download `google-services.json`
- [ ] Register iOS app in dev Firebase project
  - Bundle ID: `com.pillsaathi` (or your actual bundle)
  - Download `GoogleService-Info.plist`
- [ ] Register Android app in prod Firebase project
- [ ] Register iOS app in prod Firebase project

---

## 2. Project Dependencies

### 2.1 Install Firebase Dependencies

- [x] Install `@react-native-firebase/app`
- [x] Install `@react-native-firebase/auth`
- [x] Install `@react-native-firebase/firestore`
- [x] Install `@react-native-firebase/messaging`
- [ ] Run `pod install` for iOS

### 2.2 Install Navigation Dependencies

- [x] Install `@react-navigation/native`
- [x] Install `@react-navigation/native-stack`
- [x] Install `@react-navigation/bottom-tabs`
- [x] Install `react-native-screens`
- [x] Install `react-native-safe-area-context`
- [ ] Run `pod install` for iOS

### 2.3 Install Notification Dependencies

- [x] Install `@notifee/react-native`
- [ ] Run `pod install` for iOS

### 2.4 Install Utility Dependencies

- [x] Install `react-native-config` (for environment variables)
- [x] Install `@react-native-async-storage/async-storage`
- [ ] Run `pod install` for iOS

### 2.5 Install Development Dependencies

- [x] Install `@babel/preset-flow` (if using Flow types)
- [x] Install `eslint-plugin-react-hooks`
- [x] Install `eslint-plugin-react-native`
- [x] Update ESLint configuration for JavaScript best practices

---

## 3. Android Configuration

### 3.1 Firebase Configuration

- [x] Copy `google-services.json` to `android/app/`
- [x] Update `android/build.gradle` - add Google services classpath
- [x] Update `android/app/build.gradle` - apply Google services plugin
- [x] Add Firebase dependencies to `android/app/build.gradle`

### 3.2 Notification Configuration

- [x] Add notification permissions to `AndroidManifest.xml`
- [x] Configure notification channels for Notifee
- [x] Add foreground service permission (for alarms)

### 3.3 Build Configuration

- [x] Test debug build: `cd android && ./gradlew assembleDebug`
- [x] Verify no build errors
- [ ] Test app launches on Android device/emulator

---

## 4. iOS Configuration

### 4.1 Firebase Configuration

- [ ] Copy `GoogleService-Info.plist` to `ios/PillSaathi/`
- [ ] Add to Xcode project (drag and drop)
- [ ] Verify file is in target membership

### 4.2 Notification Configuration

- [ ] Enable Push Notifications capability in Xcode
- [ ] Enable Background Modes capability (Remote notifications)
- [ ] Configure APNs in Firebase Console
- [ ] Upload APNs authentication key

### 4.3 Build Configuration

- [ ] Run `pod install` in ios directory
- [ ] Open workspace in Xcode
- [ ] Test build in Xcode
- [ ] Test app launches on iOS simulator/device

---

## 5. Environment Configuration

### 5.1 Create Environment Files

- [x] Create `.env.development` file
- [ ] Create `.env.production` file
- [x] Add Firebase config variables to both files
- [x] Add `.env*` to `.gitignore`

### 5.2 Configure react-native-config

- [x] Set up Android configuration for react-native-config
- [ ] Set up iOS configuration for react-native-config
- [x] Test environment variable loading

### 5.3 Create Firebase Config Module

- [x] Create `src/config/firebase.js`
- [x] Initialize Firebase with environment variables
- [x] Export Firebase instances (auth, firestore, messaging)
- [ ] Add environment indicator (dev/prod)

---

## 6. Project Structure

### 6.1 Create Directory Structure

- [x] Create `src/` directory
- [x] Create `src/screens/` directory
- [x] Create `src/navigation/` directory
- [x] Create `src/components/` directory
- [x] Create `src/services/` directory
- [x] Create `src/utils/` directory
- [x] Create `src/types/` directory
- [x] Create `src/config/` directory
- [x] Create `src/contexts/` directory

### 6.2 Move Existing Files

- [x] Keep `App.js` in root or move to `src/App.js`
- [x] Update imports in `index.js`
- [x] Verify app still runs

---

## 7. Navigation Setup

### 7.1 Create Navigation Types

- [x] Create `src/types/navigation.js` (or use JSDoc for type hints)
- [x] Define navigation param lists with JSDoc comments
- [x] Export navigation constants

### 7.2 Create Navigation Structure

- [x] Create `src/navigation/RootNavigator.js`
- [x] Create `src/navigation/AuthNavigator.js`
- [x] Create `src/navigation/ParentNavigator.js`
- [x] Create `src/navigation/CaregiverNavigator.js`

### 7.3 Implement Navigation

- [x] Set up NavigationContainer in App.js
- [x] Implement stack navigation
- [x] Add navigation state persistence (optional)
- [x] Test navigation between screens

---

## 8. Placeholder Screens

### 8.1 Create Auth Screens

- [x] Create `src/screens/SplashScreen.js`
- [x] Create `src/screens/auth/LoginScreen.js` (placeholder)
- [x] Add basic UI with "Login" text

### 8.2 Create Parent Screens

- [x] Create `src/screens/parent/ParentHomeScreen.js` (placeholder)
- [x] Add basic UI with "Parent Home" text

### 8.3 Create Caregiver Screens

- [x] Create `src/screens/caregiver/CaregiverHomeScreen.js` (placeholder)
- [x] Add basic UI with "Caregiver Home" text

### 8.4 Wire Up Screens

- [x] Add screens to navigation
- [x] Test navigation to each screen
- [x] Verify back navigation works

---

## 9. Firebase Integration Testing

### 9.1 Test Firebase Connection

- [x] Create `src/services/firebase.test.js`
- [x] Test Firestore connection
- [x] Test Auth initialization
- [x] Verify no connection errors in logs

### 9.2 Test Environment Switching

- [x] Build with dev environment
- [x] Verify connects to dev Firebase
- [ ] Build with prod environment
- [ ] Verify connects to prod Firebase

### 9.3 Create Test Utilities

- [x] Create `src/utils/firebaseTest.js`
- [x] Add function to test Firestore write
- [x] Add function to test Firestore read
- [x] Test on both platforms

---

## 10. Development Tools

### 10.1 Configure Debugging

- [ ] Set up React Native Debugger
- [ ] Configure Flipper (if not already)
- [ ] Test debugging on Android
- [ ] Test debugging on iOS

### 10.2 Configure Linting

- [ ] Update `.eslintrc.js` for JavaScript best practices
- [ ] Add Firebase-specific lint rules
- [ ] Run linter and fix issues
- [ ] Add lint script to package.json

### 10.3 Configure Formatting

- [x] Update `.prettierrc.js` if needed
- [x] Format all new files
- [x] Add format script to package.json

---

## 11. Documentation

### 11.1 Update README

- [ ] Add Firebase setup instructions
- [ ] Add environment setup instructions
- [ ] Add build instructions
- [ ] Add troubleshooting section

### 11.2 Create Setup Guide

- [x] Document Android setup steps
- [ ] Document iOS setup steps
- [ ] Document common issues and solutions

### 11.3 Code Documentation

- [x] Add JSDoc comments to config files
- [ ] Add comments to navigation setup
- [ ] Document environment variables

---

## 12. Testing & Verification

### 12.1 Android Testing

- [ ] Clean build: `cd android && ./gradlew clean`
- [ ] Build debug APK
- [ ] Install on physical device
- [ ] Verify app launches
- [ ] Verify Firebase connection
- [ ] Verify navigation works
- [ ] Check logs for errors

### 12.2 iOS Testing

- [ ] Clean build in Xcode
- [ ] Build for simulator
- [ ] Build for physical device
- [ ] Verify app launches
- [ ] Verify Firebase connection
- [ ] Verify navigation works
- [ ] Check logs for errors

### 12.3 Cross-Platform Testing

- [ ] Test on Android 8.0
- [ ] Test on Android 13+
- [ ] Test on iOS 14
- [ ] Test on iOS 17+
- [ ] Document any platform-specific issues

---

## 13. Git & Version Control

### 13.1 Update .gitignore

- [ ] Add `.env*` files
- [ ] Add Firebase config files (if sensitive)
- [ ] Add build artifacts
- [ ] Verify no secrets in repo

### 13.2 Commit Changes

- [ ] Commit Firebase integration
- [ ] Commit navigation setup
- [ ] Commit placeholder screens
- [ ] Commit documentation updates

### 13.3 Create Branch Strategy

- [ ] Create `develop` branch
- [ ] Create `main` branch for production
- [ ] Document branching strategy

---

## 14. CI/CD Setup (Optional for Phase 0)

### 14.1 Configure CI

- [ ] Set up GitHub Actions / GitLab CI
- [ ] Add build job for Android
- [ ] Add build job for iOS
- [ ] Add lint job

### 14.2 Configure Environment Secrets

- [ ] Add Firebase config to CI secrets
- [ ] Add signing keys (if applicable)
- [ ] Test CI build

---

## 15. Phase 0 Completion Checklist

### 15.1 Functionality

- [ ] App builds successfully on Android
- [ ] App builds successfully on iOS
- [ ] Firebase connection established
- [ ] Navigation works between screens
- [ ] Environment switching works

### 15.2 Code Quality

- [ ] JavaScript code follows best practices
- [ ] Linting passes with no errors
- [ ] Code is formatted consistently
- [ ] No console errors or warnings

### 15.3 Documentation

- [ ] README is up to date
- [ ] Setup guide is complete
- [ ] Code is documented
- [ ] Troubleshooting guide exists

### 15.4 Testing

- [ ] Manual testing completed on Android
- [ ] Manual testing completed on iOS
- [ ] Firebase integration verified
- [ ] No critical bugs

### 15.5 Handoff

- [ ] Code reviewed
- [ ] Documentation reviewed
- [ ] Demo to team
- [ ] Ready for Phase 1

---

## Notes

- Prioritize tasks 1-9 for core functionality
- Tasks 10-14 can be done in parallel or deferred
- Test frequently on both platforms
- Document any issues encountered
- Update this task list as needed

---

## Estimated Time

- Firebase Setup: 1-2 days
- Dependencies & Configuration: 2-3 days
- Navigation & Screens: 2-3 days
- Testing & Documentation: 1-2 days

**Total: 6-10 days**

---

## Next Phase

Once Phase 0 is complete, proceed to Phase 1: Authentication & User Management
