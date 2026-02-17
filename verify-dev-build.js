/**
 * Verification script for dev environment build
 * This script checks that the build is configured for the development environment
 */

const fs = require('fs');
const path = require('path');

console.log('=== PillSathi Dev Environment Build Verification ===\n');

// Check if .env.development exists
const envDevPath = path.join(__dirname, '.env.development');
if (fs.existsSync(envDevPath)) {
  console.log('✓ .env.development file exists');

  // Read and verify key environment variables
  const envContent = fs.readFileSync(envDevPath, 'utf8');
  const envVars = {
    ENV: 'development',
    FIREBASE_PROJECT_ID: 'pillsathi-dev',
    FIREBASE_PROJECT_NUMBER: '1054326980522',
  };

  let allVarsPresent = true;
  for (const [key, expectedValue] of Object.entries(envVars)) {
    const regex = new RegExp(`${key}=${expectedValue}`, 'i');
    if (regex.test(envContent)) {
      console.log(`✓ ${key} is set to ${expectedValue}`);
    } else {
      console.log(`✗ ${key} is not set correctly`);
      allVarsPresent = false;
    }
  }

  if (allVarsPresent) {
    console.log(
      '\n✓ All required environment variables are configured correctly',
    );
  }
} else {
  console.log('✗ .env.development file not found');
}

// Check if google-services.json exists
const googleServicesPath = path.join(
  __dirname,
  'android',
  'app',
  'google-services.json',
);
if (fs.existsSync(googleServicesPath)) {
  console.log('✓ google-services.json exists in android/app/');

  // Verify it's for the dev project
  const googleServices = JSON.parse(
    fs.readFileSync(googleServicesPath, 'utf8'),
  );
  if (
    googleServices.project_info &&
    googleServices.project_info.project_id === 'pillsathi-dev'
  ) {
    console.log('✓ google-services.json is configured for pillsathi-dev');
  } else {
    console.log('✗ google-services.json is not configured for pillsathi-dev');
  }
} else {
  console.log('✗ google-services.json not found');
}

// Check if debug APK was built
const apkPath = path.join(
  __dirname,
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'debug',
  'app-debug.apk',
);
if (fs.existsSync(apkPath)) {
  const stats = fs.statSync(apkPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✓ Debug APK built successfully (${fileSizeMB} MB)`);
  console.log(`  Location: ${apkPath}`);
} else {
  console.log('✗ Debug APK not found');
}

// Check build.gradle configuration
const buildGradlePath = path.join(__dirname, 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

  // Check for react-native-config configuration
  if (buildGradleContent.includes('project.ext.envConfigFiles')) {
    console.log('✓ react-native-config is configured in build.gradle');

    if (buildGradleContent.includes('debug: ".env.development"')) {
      console.log('✓ Debug build is configured to use .env.development');
    }
  }

  // Check for Google services plugin
  if (
    buildGradleContent.includes(
      "apply plugin: 'com.google.gms.google-services'",
    )
  ) {
    console.log('✓ Google services plugin is applied');
  }
}

console.log('\n=== Build Verification Complete ===');
console.log('\nNext steps:');
console.log('1. Install the APK on an Android device or emulator');
console.log('2. Verify the app connects to the pillsathi-dev Firebase project');
console.log('3. Check logs for any Firebase connection errors');
