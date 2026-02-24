# PillSathi Setup Guide Index

Complete guide to setting up the PillSathi React Native application with Firebase integration.

---

## Overview

This index provides links to all setup documentation for the PillSathi project. Follow the guides in order for a smooth setup experience.

---

## Quick Start

For experienced developers who want to get started quickly:

1. **Prerequisites**: Node.js 18+, Android Studio, Xcode (macOS)
2. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd PillSathi
   npm install
   ```
3. **Configure Firebase**: Create `.env.development` with Firebase credentials
4. **Run**:

   ```bash
   # Android
   npm run android

   # iOS (macOS only)
   cd ios && bundle exec pod install && cd ..
   npm run ios
   ```

For detailed instructions, see the guides below.

---

## Setup Guides

### 1. Environment Setup

**[Main README - Environment Setup Section](../README.md#environment-setup)**

Covers:

- System requirements
- Installing development tools (Node.js, Android Studio, Xcode)
- Project setup
- Environment variables configuration

**Start here** if you're setting up the project for the first time.

---

### 2. Firebase Configuration

**[Firebase Setup Guide](../FIREBASE-SETUP-GUIDE.md)**

Covers:

- Creating Firebase projects (dev and prod)
- Enabling Firebase services (Auth, Firestore, Messaging)
- Registering Android and iOS apps
- Downloading configuration files
- Firebase security rules

**Required** before running the app.

---

### 3. Platform-Specific Setup

#### Android Setup

**[Android Setup Guide](./ANDROID-SETUP-GUIDE.md)**

Covers:

- Android prerequisites and environment variables
- Firebase configuration for Android
- Project configuration (build.gradle, AndroidManifest.xml)
- Building and testing on Android
- Android-specific troubleshooting

**Follow this** if you're developing for Android.

#### iOS Setup

**[iOS Setup Guide](./IOS-SETUP-GUIDE.md)**

Covers:

- iOS prerequisites (Xcode, CocoaPods)
- Firebase configuration for iOS
- Xcode project configuration
- CocoaPods setup
- Building and testing on iOS
- iOS-specific troubleshooting

**Follow this** if you're developing for iOS (requires macOS).

---

### 4. Environment Variables

**[Environment Variables Guide](./ENVIRONMENT-VARIABLES.md)**

Covers:

- Complete list of environment variables
- How to configure .env files
- Platform-specific configuration
- Switching between dev and prod environments
- Security best practices

**Reference this** when configuring environment variables.

---

### 5. Debugging

**[Debugging Quick Start](./DEBUGGING-QUICK-START.md)**

Quick reference for:

- Common debugging commands
- Viewing logs
- Using React Native debugger
- Performance profiling

**Use this** for quick debugging tasks.

**[Debugging Setup Guide](./DEBUGGING-SETUP.md)**

Comprehensive guide for:

- Setting up debugging tools
- React Native Debugger
- Flipper
- Platform-specific debugging
- Advanced debugging techniques

**Follow this** for complete debugging setup.

---

### 6. Troubleshooting

**[Common Issues and Solutions](./COMMON-ISSUES-AND-SOLUTIONS.md)**

Quick reference for:

- Build issues
- Firebase issues
- Environment issues
- Navigation issues
- Dependency issues
- Platform-specific issues
- Performance issues

**Check this first** when you encounter problems.

**[Main README - Troubleshooting Section](../README.md#troubleshooting)**

Additional troubleshooting information integrated into the main README.

---

## Setup Workflow

### First-Time Setup

1. **Install Prerequisites**

   - Follow [README - Environment Setup](../README.md#environment-setup)
   - Install Node.js, Android Studio, Xcode (macOS)

2. **Clone and Install Dependencies**

   ```bash
   git clone <repository-url>
   cd PillSathi
   npm install
   ```

3. **Configure Firebase**

   - Follow [Firebase Setup Guide](../FIREBASE-SETUP-GUIDE.md)
   - Create Firebase projects
   - Download configuration files

4. **Configure Environment Variables**

   - Follow [Environment Variables Guide](./ENVIRONMENT-VARIABLES.md)
   - Create `.env.development` file
   - Add Firebase credentials

5. **Platform-Specific Setup**

   - **Android**: Follow [Android Setup Guide](./ANDROID-SETUP-GUIDE.md)
   - **iOS**: Follow [iOS Setup Guide](./IOS-SETUP-GUIDE.md)

6. **Verify Setup**

   ```bash
   # Verify Firebase connection
   node scripts/verify-firebase-dev-connection.js

   # Run tests
   npm test
   ```

7. **Run the App**

   ```bash
   # Android
   npm run android

   # iOS
   npm run ios
   ```

---

### Adding a New Developer

When onboarding a new developer:

1. **Share repository access**
2. **Provide Firebase credentials** (securely)
3. **Point to this index** for setup instructions
4. **Verify their setup** using verification scripts
5. **Review** [Common Issues](./COMMON-ISSUES-AND-SOLUTIONS.md) together

---

### Setting Up Production Environment

1. **Create production Firebase project**

   - Follow [Firebase Setup Guide](../FIREBASE-SETUP-GUIDE.md)
   - Use `pillsathi-prod` as project ID

2. **Configure production environment**

   - Create `.env.production` file
   - Add production Firebase credentials
   - Follow [Environment Variables Guide](./ENVIRONMENT-VARIABLES.md)

3. **Register production apps**

   - Register Android app in production Firebase
   - Register iOS app in production Firebase
   - Download production configuration files

4. **Build with production environment**

   ```bash
   # Android
   ENVFILE=.env.production npm run android

   # iOS
   ENVFILE=.env.production npm run ios
   ```

---

## Verification Checklist

After completing setup, verify:

### General

- [ ] Node.js 18+ installed
- [ ] npm 8+ installed
- [ ] Git configured
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)

### Firebase

- [ ] Firebase project created (dev)
- [ ] Firebase services enabled (Auth, Firestore, Messaging)
- [ ] `.env.development` file created
- [ ] Firebase credentials configured
- [ ] Firebase connection verified

### Android (if applicable)

- [ ] Android Studio installed
- [ ] Android SDK installed (API 26+)
- [ ] ANDROID_HOME environment variable set
- [ ] `google-services.json` downloaded and placed
- [ ] Android build succeeds
- [ ] App runs on Android emulator/device

### iOS (if applicable)

- [ ] Xcode 14+ installed
- [ ] Command Line Tools installed
- [ ] CocoaPods installed
- [ ] `GoogleService-Info.plist` downloaded and added
- [ ] Pods installed (`bundle exec pod install`)
- [ ] iOS build succeeds
- [ ] App runs on iOS simulator/device

### Testing

- [ ] Firebase connection test passes
- [ ] Navigation works correctly
- [ ] No console errors
- [ ] App launches successfully

---

## Quick Reference

### Common Commands

```bash
# Install dependencies
npm install

# Install iOS pods
cd ios && bundle exec pod install && cd ..

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run tests
npm test

# Verify Firebase connection
node scripts/verify-firebase-dev-connection.js

# Clean builds
npm run clean:android
npm run clean:ios

# View logs
npm run log:android
npm run log:ios

# Start Metro bundler
npm start

# Reset Metro cache
npm start -- --reset-cache
```

### Important Files

- `.env.development` - Development environment variables
- `.env.production` - Production environment variables
- `android/app/google-services.json` - Android Firebase config
- `ios/PillSaathi/GoogleService-Info.plist` - iOS Firebase config
- `src/config/firebase.js` - Firebase initialization

### Important Directories

- `src/` - Application source code
- `android/` - Android native code
- `ios/` - iOS native code
- `docs/` - Documentation
- `scripts/` - Utility scripts
- `__tests__/` - Test files

---

## Getting Help

If you encounter issues:

1. **Check** [Common Issues and Solutions](./COMMON-ISSUES-AND-SOLUTIONS.md)
2. **Review** platform-specific troubleshooting:
   - [Android Setup Guide - Troubleshooting](./ANDROID-SETUP-GUIDE.md#troubleshooting)
   - [iOS Setup Guide - Troubleshooting](./IOS-SETUP-GUIDE.md#troubleshooting)
3. **Run diagnostics**:
   ```bash
   node --version
   npm --version
   node scripts/verify-firebase-dev-connection.js
   ```
4. **Check logs**:

   ```bash
   # Android
   adb logcat | grep -E "ReactNative|Firebase"

   # iOS
   # Check Xcode console
   ```

5. **Search documentation** for specific error messages
6. **Ask for help** with full error details and logs

---

## Additional Resources

### Official Documentation

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)

### Project Documentation

- [Project Roadmap](../PROJECT-ROADMAP.md)
- [Implementation Phases](../IMPLEMENTATION-PHASES.md)
- [Product Requirements Document](../PillSathi-PRD.md)
- [Functional Requirements Document](../PillSathi-FRD.md)
- [Technical Architecture Document](../PillSathi-TAD.md)

### Development Guides

- [Best Practices Checklist](./BEST-PRACTICES-CHECKLIST.md)
- [Code Quality Improvements](./CODE-QUALITY-IMPROVEMENTS.md)
- [Security Audit](../SECURITY-AUDIT.md)

---

## Document Maintenance

### Last Updated

**Date**: 2026-02-17  
**Version**: 1.0

### Update Schedule

- Review after major dependency updates
- Update when adding new features
- Revise based on developer feedback

### Contributing

When updating documentation:

1. Keep guides focused and concise
2. Include code examples
3. Add troubleshooting sections
4. Update this index when adding new guides
5. Maintain consistent formatting

---

**Need help?** Start with the [Common Issues and Solutions](./COMMON-ISSUES-AND-SOLUTIONS.md) guide or check the platform-specific setup guides above.
