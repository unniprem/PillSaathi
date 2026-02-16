# Phase 0: Foundation & Firebase Setup - Tasks

Version: 1.0
Date: 2026-02-16
Status: Not Started

---

## Task Overview

This task list covers Phase 0 implementation for the existing React Native app. Focus is on Firebase integration, TypeScript migration, and navigation setup.

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

### 2.5 Install TypeScript Dependencies (if not already)

- [ ] Install `typescript`
- [ ] Install `@types/react`
- [ ] Install `@types/react-native`
- [ ] Create `tsconfig.json` if not exists

---

## 3. Android Configuration

### 3.1 Firebase Configuration

- [x] Copy `google-services.json` to `android/app/`
- [x] Update `android/build.gradle` - add Google services classpath
- [-] Update `android/app/build.gradle` - apply Google services plugin
- [~] Add Firebase dependencies to `android/app/build.gradle`

### 3.2 Notification Configuration

- [ ] Add notification permissions to `AndroidManifest.xml`
- [ ] Configure notification channels for Notifee
- [ ] Add foreground service permission (for alarms)

### 3.3 Build Configuration

- [ ] Test debug build: `cd android && ./gradlew assembleDebug`
- [ ] Verify no build errors
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

- [ ] Create `.env.development` file
- [ ] Create `.env.production` file
- [ ] Add Firebase config variables to both files
- [ ] Add `.env*` to `.gitignore`

### 5.2 Configure react-native-config

- [ ] Set up Android configuration for react-native-config
- [ ] Set up iOS configuration for react-native-config
- [ ] Test environment variable loading

### 5.3 Create Firebase Config Module

- [ ] Create `src/config/firebase.ts`
- [ ] Initialize Firebase with environment variables
- [ ] Export Firebase instances (auth, firestore, messaging)
- [ ] Add environment indicator (dev/prod)

---

## 6. Project Structure

### 6.1 Create Directory Structure

- [ ] Create `src/` directory
- [ ] Create `src/screens/` directory
- [ ] Create `src/navigation/` directory
- [ ] Create `src/components/` directory
- [ ] Create `src/services/` directory
- [ ] Create `src/utils/` directory
- [ ] Create `src/types/` directory
- [ ] Create `src/config/` directory
- [ ] Create `src/contexts/` directory

### 6.2 Move Existing Files

- [ ] Move `App.js` to `src/App.tsx` (convert to TypeScript)
- [ ] Update imports in `index.js`
- [ ] Verify app still runs

---

## 7. Navigation Setup

### 7.1 Create Navigation Types

- [ ] Create `src/types/navigation.ts`
- [ ] Define navigation param lists
- [ ] Export navigation types

### 7.2 Create Navigation Structure

- [ ] Create `src/navigation/RootNavigator.tsx`
- [ ] Create `src/navigation/AuthNavigator.tsx`
- [ ] Create `src/navigation/ParentNavigator.tsx`
- [ ] Create `src/navigation/CaregiverNavigator.tsx`

### 7.3 Implement Navigation

- [ ] Set up NavigationContainer in App.tsx
- [ ] Implement stack navigation
- [ ] Add navigation state persistence (optional)
- [ ] Test navigation between screens

---

## 8. Placeholder Screens

### 8.1 Create Auth Screens

- [ ] Create `src/screens/SplashScreen.tsx`
- [ ] Create `src/screens/auth/LoginScreen.tsx` (placeholder)
- [ ] Add basic UI with "Login" text

### 8.2 Create Parent Screens

- [ ] Create `src/screens/parent/ParentHomeScreen.tsx` (placeholder)
- [ ] Add basic UI with "Parent Home" text

### 8.3 Create Caregiver Screens

- [ ] Create `src/screens/caregiver/CaregiverHomeScreen.tsx` (placeholder)
- [ ] Add basic UI with "Caregiver Home" text

### 8.4 Wire Up Screens

- [ ] Add screens to navigation
- [ ] Test navigation to each screen
- [ ] Verify back navigation works

---

## 9. Firebase Integration Testing

### 9.1 Test Firebase Connection

- [ ] Create `src/services/firebase.test.ts`
- [ ] Test Firestore connection
- [ ] Test Auth initialization
- [ ] Verify no connection errors in logs

### 9.2 Test Environment Switching

- [ ] Build with dev environment
- [ ] Verify connects to dev Firebase
- [ ] Build with prod environment
- [ ] Verify connects to prod Firebase

### 9.3 Create Test Utilities

- [ ] Create `src/utils/firebaseTest.ts`
- [ ] Add function to test Firestore write
- [ ] Add function to test Firestore read
- [ ] Test on both platforms

---

## 10. Development Tools

### 10.1 Configure Debugging

- [ ] Set up React Native Debugger
- [ ] Configure Flipper (if not already)
- [ ] Test debugging on Android
- [ ] Test debugging on iOS

### 10.2 Configure Linting

- [ ] Update `.eslintrc.js` for TypeScript
- [ ] Add Firebase-specific lint rules
- [ ] Run linter and fix issues
- [ ] Add lint script to package.json

### 10.3 Configure Formatting

- [ ] Update `.prettierrc.js` if needed
- [ ] Format all new files
- [ ] Add format script to package.json

---

## 11. Documentation

### 11.1 Update README

- [ ] Add Firebase setup instructions
- [ ] Add environment setup instructions
- [ ] Add build instructions
- [ ] Add troubleshooting section

### 11.2 Create Setup Guide

- [ ] Document Android setup steps
- [ ] Document iOS setup steps
- [ ] Document common issues and solutions

### 11.3 Code Documentation

- [ ] Add JSDoc comments to config files
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

- [ ] TypeScript compilation passes
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
