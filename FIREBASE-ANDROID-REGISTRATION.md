# Firebase Android App Registration Guide

## Task: Register Android App in Dev Firebase Project

**Package Name**: `com.pillsaathi`

---

## Step-by-Step Instructions

### 1. Access Firebase Console

1. Open your browser and go to: https://console.firebase.google.com/
2. Sign in with your Google account
3. Select the `pillsathi-dev` project from your project list

### 2. Add Android App

1. In the Firebase Console, click on the **gear icon (⚙️)** next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to the **"Your apps"** section
4. Click the **Android icon** (or "+ Add app" if you have other apps)

### 3. Register App Details

Enter the following information:

- **Android package name**: `com.pillsaathi`

  - ⚠️ This must match exactly - it's defined in `android/app/build.gradle`
  - This cannot be changed later!

- **App nickname (optional)**: `PillSathi Dev Android`

  - Recommended to help distinguish between dev/prod

- **Debug signing certificate SHA-1 (optional)**:
  - You can skip this for now
  - Required later for Google Sign-In (if used)
  - Can be added later in Project Settings

4. Click **"Register app"**

### 4. Download Configuration File

1. The next screen will prompt you to download `google-services.json`
2. Click **"Download google-services.json"**
3. Save the file to your computer

### 5. Place Configuration File

**IMPORTANT**: The file must be placed in the correct location:

```
android/app/google-services.json
```

**To add the file:**

1. Locate the downloaded `google-services.json` file on your computer
2. Copy it to: `<project-root>/android/app/google-services.json`
3. Verify the file is in the correct location

### 6. Verify File Contents

The `google-services.json` file should contain:

```json
{
  "project_info": {
    "project_number": "...",
    "project_id": "pillsathi-dev",
    "storage_bucket": "..."
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "...",
        "android_client_info": {
          "package_name": "com.pillsaathi"
        }
      },
      ...
    }
  ],
  ...
}
```

**Verify**:

- `project_id` should be `pillsathi-dev`
- `package_name` should be `com.pillsaathi`

### 7. Complete Firebase Console Steps

1. After downloading, click **"Next"** in the Firebase Console
2. You'll see instructions for adding Firebase SDK - we'll do this in a later task
3. Click **"Next"** again
4. Click **"Continue to console"**

---

## Security Notes

⚠️ **IMPORTANT**:

- The `google-services.json` file contains sensitive configuration
- It should be added to `.gitignore` if you want to keep it private
- However, for dev environments, it's often committed to the repo
- For production, NEVER commit `google-services.json` to public repositories

---

## Verification Checklist

After completing these steps, verify:

- [ ] Android app is registered in Firebase Console
- [ ] Package name is `com.pillsaathi`
- [ ] `google-services.json` file is downloaded
- [ ] File is placed at `android/app/google-services.json`
- [ ] File contains correct `project_id` and `package_name`

---

## Troubleshooting

### Issue: Can't find "Add app" button

- Make sure you're in the correct Firebase project (`pillsathi-dev`)
- Check that you have Owner or Editor permissions

### Issue: Package name already registered

- The package name might already be registered in this project
- Check the "Your apps" section to see if it exists
- If it exists, download the `google-services.json` from Project Settings

### Issue: Wrong package name entered

- Package names cannot be changed after registration
- You'll need to delete the app and re-register (or create a new Firebase project)

---

## Next Steps

After completing this task:

1. The `google-services.json` file will be used in Task 3.1 (Android Configuration)
2. We'll add the Google Services plugin to the build configuration
3. Firebase SDK will be integrated in subsequent tasks

---

## Getting Debug SHA-1 (Optional - for later)

If you need to add the SHA-1 certificate later:

```bash
# For debug keystore
cd android
./gradlew signingReport
```

Look for the SHA-1 under "Variant: debug" and add it in Firebase Console under Project Settings > Your apps > Android app.

---

## Status

- [x] Package name identified: `com.pillsaathi`
- [ ] Android app registered in Firebase Console
- [ ] `google-services.json` downloaded
- [ ] File placed at `android/app/google-services.json`
