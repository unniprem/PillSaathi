# Firebase Android Setup - Quick Reference

## Current Status

✅ **Package Name Identified**: `com.pillsaathi`  
✅ **Template Created**: `google-services.json.template`  
⏳ **Pending**: Download actual `google-services.json` from Firebase Console

---

## Quick Setup Steps

### 1. Register App in Firebase Console

Visit: https://console.firebase.google.com/

1. Select project: **pillsathi-dev**
2. Go to: **Project Settings** (gear icon)
3. Scroll to: **Your apps** section
4. Click: **Add app** → **Android**
5. Enter package name: **com.pillsaathi**
6. App nickname: **PillSathi Dev Android** (optional)
7. Click: **Register app**

### 2. Download Configuration

1. Download the **google-services.json** file
2. Save it to this directory: `android/app/google-services.json`
3. Verify the file contains:
   - `"project_id": "pillsathi-dev"`
   - `"package_name": "com.pillsaathi"`

### 3. Verify File Location

The file MUST be at:

```
android/app/google-services.json
```

NOT at:

- ❌ `android/google-services.json`
- ❌ `google-services.json`
- ❌ `android/app/src/google-services.json`

---

## Expected File Structure

```json
{
  "project_info": {
    "project_number": "1054326980522",  // Your actual project number
    "project_id": "pillsathi-dev",
    "storage_bucket": "pillsathi-dev.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:1054326980522:android:...",
        "android_client_info": {
          "package_name": "com.pillsaathi"
        }
      },
      "oauth_client": [...],
      "api_key": [
        {
          "current_key": "AIza..."
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        }
      }
    }
  ],
  "configuration_version": "1"
}
```

---

## Verification Checklist

After downloading the file:

- [ ] File is named exactly `google-services.json` (no .template, no .txt)
- [ ] File is in `android/app/` directory
- [ ] File contains valid JSON
- [ ] `project_id` matches `pillsathi-dev`
- [ ] `package_name` matches `com.pillsaathi`
- [ ] File size is reasonable (typically 2-5 KB)

---

## Common Issues

### Issue: "google-services.json not found"

**Solution**: Ensure file is at `android/app/google-services.json`, not in a subdirectory

### Issue: "Package name mismatch"

**Solution**: Verify the package name in Firebase Console matches `com.pillsaathi` exactly

### Issue: "Invalid JSON"

**Solution**: Re-download the file from Firebase Console, don't edit it manually

---

## Next Steps

After placing the file:

1. ✅ Mark task as complete in `tasks.md`
2. → Proceed to Task 3.1: Android Firebase Configuration
3. → Add Google Services plugin to build.gradle files

---

## Notes

- The sender_id/project_number appears to be: `1054326980522` (from notes file)
- This file is safe to commit for dev environments
- For production, consider using environment-specific configurations
