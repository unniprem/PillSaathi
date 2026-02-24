# Phase 0: Foundation & Firebase Setup - Requirements

Version: 1.0
Date: 2026-02-16
Phase: 0 - Foundation

---

## 1. Overview

Phase 0 establishes the foundational infrastructure for PillSathi. This includes Firebase project setup, React Native project initialization, and basic app structure. No user-facing features are implemented in this phase.

---

## 2. Goals

- Set up development and production Firebase environments
- Initialize React Native project with TypeScript
- Integrate Firebase SDK
- Create basic navigation structure
- Establish development workflow

---

## 3. User Stories

### 3.1 As a Developer

**3.1.1** I can run the app on Android emulator/device

- App launches without errors
- Firebase connection is established
- Development environment is configured

**3.1.2** I can run the app on iOS simulator/device

- App launches without errors
- Firebase connection is established
- Development environment is configured

**3.1.3** I can switch between dev and prod Firebase environments

- Environment variables control which Firebase project is used
- Clear indication of which environment is active

**3.1.4** I can navigate between placeholder screens

- Navigation framework is set up
- Basic screen structure exists
- Navigation works on both platforms

---

## 4. Acceptance Criteria

### 4.1 Firebase Setup

**4.1.1** Firebase projects exist

- `pillsathi-dev` project created
- `pillsathi-prod` project created
- Both projects have Authentication enabled
- Both projects have Firestore database created
- Both projects have Cloud Functions initialized

**4.1.2** Firebase configuration is integrated

- Android app registered in Firebase
- iOS app registered in Firebase
- `google-services.json` in place (Android)
- `GoogleService-Info.plist` in place (iOS)
- Environment variables configured

**4.1.3** Firebase SDK is functional

- App connects to Firestore
- App can initialize Firebase Auth
- No connection errors in logs

### 4.2 React Native Project

**4.2.1** Project structure is initialized

- TypeScript configured
- ESLint configured
- Prettier configured
- Git repository initialized
- `.gitignore` properly configured

**4.2.2** Dependencies are installed

- React Native (latest stable)
- React Navigation
- Firebase SDK (@react-native-firebase/app, auth, firestore, messaging)
- Notifee
- TypeScript types
- Development dependencies

**4.2.3** Build configuration

- Android builds successfully
- iOS builds successfully
- Debug builds work
- Release builds work (basic)

### 4.3 Navigation Structure

**4.3.1** Navigation framework exists

- React Navigation installed and configured
- Stack navigator set up
- Tab navigator prepared (for future use)
- Type-safe navigation

**4.3.2** Placeholder screens exist

- Splash screen
- Auth screen (placeholder)
- Parent home screen (placeholder)
- Caregiver home screen (placeholder)

**4.3.3** Navigation works

- Can navigate between screens
- Back navigation works
- Navigation state persists appropriately

### 4.4 Development Environment

**4.4.1** Environment configuration

- `.env.development` file exists
- `.env.production` file exists
- Environment variables load correctly
- Firebase config switches based on environment

**4.4.2** Development tools

- React Native Debugger works
- Hot reload works
- TypeScript compilation works
- Linting works

**4.4.3** Documentation

- README with setup instructions
- Environment setup guide
- Build instructions
- Troubleshooting guide

---

## 5. Technical Requirements

### 5.1 Technology Stack

- React Native 0.73+
- TypeScript 5.0+
- React Navigation 6.x
- Firebase SDK 18.x+
- Notifee 7.x+

### 5.2 Supported Platforms

- Android 8.0+ (API 26+)
- iOS 14.0+

### 5.3 Development Environment

- Node.js 18+
- npm or yarn
- Xcode 14+ (for iOS)
- Android Studio (for Android)
- Firebase CLI

---

## 6. Dependencies

### 6.1 External Dependencies

- Firebase account with billing enabled
- Apple Developer account (for iOS)
- Google Play Console account (for Android)

### 6.2 Development Dependencies

- macOS (for iOS development)
- Android SDK
- iOS SDK

---

## 7. Out of Scope

- User authentication (Phase 1)
- Any user-facing features
- Cloud Functions implementation
- Push notifications
- Local notifications
- Data models

---

## 8. Success Metrics

- App builds successfully on both platforms
- Firebase connection established
- Navigation works without errors
- Development environment documented
- Team can run the app locally

---

## 9. Risks & Mitigations

### 9.1 Risk: Firebase configuration issues

**Mitigation**: Follow official documentation, test on both platforms

### 9.2 Risk: Build configuration problems

**Mitigation**: Use latest stable versions, document all steps

### 9.3 Risk: Platform-specific issues

**Mitigation**: Test on both Android and iOS early and often

---

## 10. Testing Requirements

### 10.1 Manual Testing

- App launches on Android
- App launches on iOS
- Firebase connection verified
- Navigation between screens works
- No console errors

### 10.2 Automated Testing

- TypeScript compilation passes
- Linting passes
- Basic smoke tests (app renders)

---

## 11. Documentation Requirements

- Setup instructions in README
- Firebase configuration guide
- Environment variable documentation
- Build and deployment instructions
- Troubleshooting guide

---

## 12. Definition of Done

- [ ] Firebase projects created (dev + prod)
- [ ] React Native project initialized with TypeScript
- [ ] Firebase SDK integrated and tested
- [ ] Navigation framework set up
- [ ] Placeholder screens created
- [ ] App builds on Android
- [ ] App builds on iOS
- [ ] Environment configuration working
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] No critical bugs

---

## 13. Next Phase

Phase 1: Authentication & User Management

- Phone OTP login
- Role selection
- User profile creation
