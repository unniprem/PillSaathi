# Test Data Setup for Phase 5 Escalation

This guide explains how to create test data in Firestore for testing the escalation functionality.

## Prerequisites

- Firebase project configured (dev environment)
- Firebase Admin SDK credentials set up
- Node.js 18+ installed
- Firebase CLI installed and logged in

## Setup

1. Navigate to the functions directory:

   ```bash
   cd functions
   ```

2. Ensure dependencies are installed:

   ```bash
   npm install
   ```

3. Set up Firebase credentials:

   **Option A: Using Firebase CLI (Recommended for local testing)**

   ```bash
   firebase login
   firebase use dev
   ```

   **Option B: Using Service Account Key**

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
   ```

## Running the Script

Run the test data creation script:

```bash
node src/createTestData.js
```

## What Gets Created

The script creates the following test data:

1. **Test Parent User**

   - Email: testparent@example.com
   - Display Name: Test Parent
   - Role: parent

2. **Test Caregiver User**

   - Email: testcaregiver@example.com
   - Display Name: Test Caregiver
   - Role: caregiver

3. **Test Medicine**

   - Name: Test Medicine
   - Dosage: 10mg
   - Status: Active

4. **Test Dose**

   - Scheduled: 35 minutes in the past
   - Status: pending (ready to be escalated)

5. **Relationship**

   - Links parent and caregiver
   - Status: active

6. **Device Token**
   - For caregiver (to receive FCM notifications)
   - Platform: android

## Testing the Escalation Flow

After creating test data:

1. **Manual Trigger** (immediate):

   ```bash
   firebase functions:shell
   > scheduledDoseCheck()
   ```

2. **Wait for Scheduled Run** (every 5 minutes):

   - Cloud Scheduler will automatically trigger the function
   - Check Cloud Functions logs in Firebase Console

3. **Verify Results**:
   - Check that dose status changed to "missed"
   - Verify `missedAt` and `escalatedAt` timestamps are set
   - Check `escalationLogs` collection for log entry
   - Verify caregiver received FCM notification

## Viewing Test Data

You can view the created test data in:

- **Firebase Console**: Firestore Database section
- **Firebase CLI**:
  ```bash
  firebase firestore:get users/[parentId]
  firebase firestore:get doses/[doseId]
  ```

## Cleaning Up Test Data

To remove test data, you can:

1. Delete manually in Firebase Console
2. Use Firebase CLI:
   ```bash
   firebase firestore:delete users/[userId] --recursive
   ```

## Troubleshooting

### Permission Denied

- Ensure you're logged in: `firebase login`
- Verify project is selected: `firebase use dev`
- Check Firestore security rules allow writes

### Function Not Found

- Ensure functions are deployed: `firebase deploy --only functions`
- Check function name matches in index.js

### No Notification Received

- Verify device token is valid
- Check FCM configuration in Firebase Console
- Review function logs for errors

## Next Steps

After test data is created:

1. Monitor Cloud Function execution logs
2. Test notification delivery on real device
3. Verify adherence dashboard displays data correctly
4. Test edge cases (inactive medicine, already missed dose, etc.)
