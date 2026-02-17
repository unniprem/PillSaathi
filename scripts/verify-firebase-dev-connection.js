#!/usr/bin/env node

/**
 * Firebase Dev Connection Verification Script
 *
 * This script verifies that the app is properly configured to connect
 * to the pillsathi-dev Firebase project. It checks:
 * - Environment configuration files
 * - Firebase configuration files
 * - Build configuration
 * - Environment variables
 *
 * Run this script before deploying or testing to ensure correct setup.
 *
 * Usage: node scripts/verify-firebase-dev-connection.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: msg => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: msg => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: msg => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: msg =>
    console.log(
      `\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${
        colors.reset
      }\n`,
    ),
};

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(condition, successMsg, errorMsg) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    log.success(successMsg);
    return true;
  } else {
    failedChecks++;
    log.error(errorMsg);
    return false;
  }
}

function main() {
  log.section('Firebase Dev Connection Verification');

  // Check 1: .env.development file
  log.info('Checking environment configuration...');
  const envDevPath = path.join(__dirname, '..', '.env.development');

  if (
    check(
      fs.existsSync(envDevPath),
      '.env.development file exists',
      '.env.development file not found',
    )
  ) {
    const envContent = fs.readFileSync(envDevPath, 'utf8');

    // Verify key environment variables
    check(
      /ENV=development/i.test(envContent),
      'ENV is set to development',
      'ENV is not set to development',
    );

    check(
      /FIREBASE_PROJECT_ID=pillsathi-dev/i.test(envContent),
      'FIREBASE_PROJECT_ID is set to pillsathi-dev',
      'FIREBASE_PROJECT_ID is not set to pillsathi-dev',
    );

    check(
      /FIREBASE_AUTH_DOMAIN=pillsathi-dev\.firebaseapp\.com/i.test(envContent),
      'FIREBASE_AUTH_DOMAIN is set correctly',
      'FIREBASE_AUTH_DOMAIN is not set correctly',
    );

    check(
      /FIREBASE_PROJECT_NUMBER=1054326980522/i.test(envContent),
      'FIREBASE_PROJECT_NUMBER is correct',
      'FIREBASE_PROJECT_NUMBER is not correct',
    );
  }

  // Check 2: google-services.json (Android)
  log.info('\nChecking Android Firebase configuration...');
  const googleServicesPath = path.join(
    __dirname,
    '..',
    'android',
    'app',
    'google-services.json',
  );

  if (
    check(
      fs.existsSync(googleServicesPath),
      'google-services.json exists',
      'google-services.json not found',
    )
  ) {
    try {
      const googleServices = JSON.parse(
        fs.readFileSync(googleServicesPath, 'utf8'),
      );

      check(
        googleServices.project_info?.project_id === 'pillsathi-dev',
        'google-services.json is configured for pillsathi-dev',
        `google-services.json is configured for ${
          googleServices.project_info?.project_id || 'unknown'
        }`,
      );

      check(
        googleServices.project_info?.project_number === '1054326980522',
        'Project number matches in google-services.json',
        'Project number does not match',
      );

      check(
        googleServices.project_info?.storage_bucket ===
          'pillsathi-dev.firebasestorage.app',
        'Storage bucket is correct',
        'Storage bucket does not match',
      );
    } catch (error) {
      log.error(`Failed to parse google-services.json: ${error.message}`);
      failedChecks++;
      totalChecks++;
    }
  }

  // Check 3: Android build.gradle configuration
  log.info('\nChecking Android build configuration...');
  const buildGradlePath = path.join(
    __dirname,
    '..',
    'android',
    'app',
    'build.gradle',
  );

  if (
    check(
      fs.existsSync(buildGradlePath),
      'build.gradle exists',
      'build.gradle not found',
    )
  ) {
    const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

    check(
      buildGradleContent.includes(
        "apply plugin: 'com.google.gms.google-services'",
      ),
      'Google services plugin is applied',
      'Google services plugin is not applied',
    );

    check(
      buildGradleContent.includes('project.ext.envConfigFiles'),
      'react-native-config is configured',
      'react-native-config is not configured',
    );

    check(
      buildGradleContent.includes('debug: ".env.development"'),
      'Debug build uses .env.development',
      'Debug build does not use .env.development',
    );
  }

  // Check 4: Root build.gradle
  log.info('\nChecking root build configuration...');
  const rootBuildGradlePath = path.join(
    __dirname,
    '..',
    'android',
    'build.gradle',
  );

  if (
    check(
      fs.existsSync(rootBuildGradlePath),
      'Root build.gradle exists',
      'Root build.gradle not found',
    )
  ) {
    const rootBuildGradleContent = fs.readFileSync(rootBuildGradlePath, 'utf8');

    check(
      rootBuildGradleContent.includes('com.google.gms:google-services'),
      'Google services classpath is added',
      'Google services classpath is missing',
    );
  }

  // Check 5: Firebase config module
  log.info('\nChecking Firebase configuration module...');
  const firebaseConfigPath = path.join(
    __dirname,
    '..',
    'src',
    'config',
    'firebase.js',
  );

  if (
    check(
      fs.existsSync(firebaseConfigPath),
      'Firebase config module exists',
      'Firebase config module not found',
    )
  ) {
    const firebaseConfigContent = fs.readFileSync(firebaseConfigPath, 'utf8');

    check(
      firebaseConfigContent.includes('react-native-config'),
      'Firebase config uses react-native-config',
      'Firebase config does not use react-native-config',
    );

    check(
      firebaseConfigContent.includes('getEnvironment'),
      'Environment detection function exists',
      'Environment detection function missing',
    );

    check(
      firebaseConfigContent.includes('initializeFirebase'),
      'Firebase initialization function exists',
      'Firebase initialization function missing',
    );
  }

  // Check 6: Verification utility
  log.info('\nChecking verification utilities...');
  const verifyUtilPath = path.join(
    __dirname,
    '..',
    'src',
    'utils',
    'verifyFirebaseConnection.js',
  );

  check(
    fs.existsSync(verifyUtilPath),
    'Firebase connection verification utility exists',
    'Firebase connection verification utility not found',
  );

  // Check 7: Package.json dependencies
  log.info('\nChecking package dependencies...');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');

  if (
    check(
      fs.existsSync(packageJsonPath),
      'package.json exists',
      'package.json not found',
    )
  ) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    check(
      deps['@react-native-firebase/app'],
      '@react-native-firebase/app is installed',
      '@react-native-firebase/app is not installed',
    );

    check(
      deps['@react-native-firebase/auth'],
      '@react-native-firebase/auth is installed',
      '@react-native-firebase/auth is not installed',
    );

    check(
      deps['@react-native-firebase/firestore'],
      '@react-native-firebase/firestore is installed',
      '@react-native-firebase/firestore is not installed',
    );

    check(
      deps['react-native-config'],
      'react-native-config is installed',
      'react-native-config is not installed',
    );
  }

  // Summary
  log.section('Verification Summary');
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`${colors.green}Passed: ${passedChecks}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedChecks}${colors.reset}`);

  const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${successRate}%`);

  if (failedChecks === 0) {
    log.success('\n🎉 All checks passed! App is configured for pillsathi-dev');
    console.log('\nNext steps:');
    console.log('1. Build the app: cd android && ./gradlew assembleDebug');
    console.log('2. Install on device/emulator');
    console.log('3. Check logs for Firebase connection confirmation');
    process.exit(0);
  } else {
    log.error('\n⚠️  Some checks failed. Please fix the issues above.');
    console.log('\nRefer to the setup documentation for help.');
    process.exit(1);
  }
}

// Run the verification
main();
