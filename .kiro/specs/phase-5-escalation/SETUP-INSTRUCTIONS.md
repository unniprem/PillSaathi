# Phase 5: Setup Instructions

**Status:** Ready to Begin
**Estimated Time:** 30-45 minutes

---

## Step 1: Enable Firebase Blaze Plan (Manual - 5 minutes)

You need to enable the Blaze (pay-as-you-go) plan to use Cloud Functions.

### Instructions:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your **dev** project (e.g., `pillsathi-dev`)
3. Click **"Upgrade"** in the left sidebar (or the upgrade button)
4. Select **"Blaze"** plan
5. Follow the prompts to set up billing
6. **Set a budget alert:**
   - Go to [Google Cloud Console Billing](https://console.cloud.google.com/billing)
   - Select your billing account
   - Click "Budgets & alerts"
   - Create budget: $10/month for dev
   - Set alert at 50%, 90%, 100%

### Verification:

- You should see "Blaze plan" in Firebase Console
- No errors when accessing Cloud Functions section

---

## Step 2: Enable Required APIs (Manual - 5 minutes)

### Option A: Using Google Cloud Console (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project from the dropdown
3. Go to **"APIs & Services" > "Library"**
4. Search and enable each of these:
   - **Cloud Functions API**
   - **Cloud Scheduler API**
   - **Cloud Build API**
   - **Cloud Pub/Sub API**

### Option B: Using gcloud CLI

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable pubsub.googleapis.com
```

### Verification:

```bash
# List enabled APIs
gcloud services list --enabled | grep -E "functions|scheduler|build|pubsub"
```

You should see all 4 APIs listed.

---

## Step 3: Install Cloud Functions Dependencies (Automated - 2 minutes)

The Cloud Functions code is already created. Now install dependencies:

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Verify installation
npm list firebase-admin firebase-functions
```

Expected output:

```
functions@1.0.0
├── firebase-admin@12.0.0
└── firebase-functions@4.5.0
```

---

## Step 4: Update firebase.json (Already Done ✓)

The firebase.json file needs to include functions configuration. Let me check and update if needed.

---

## Step 5: Deploy Cloud Functions (Automated - 5-10 minutes)

Once Steps 1-3 are complete, deploy the functions:

```bash
# Return to project root
cd ..

# Login to Firebase (if not already)
firebase login

# Select your dev project
firebase use dev
# Or if you haven't set up aliases:
firebase use YOUR_DEV_PROJECT_ID

# Deploy functions
firebase deploy --only functions

# This will:
# - Build the functions
# - Upload to Cloud Functions
# - Create Cloud Scheduler job automatically
# - Take 5-10 minutes
```

Expected output:

```
✔  functions[scheduledDoseCheck(us-central1)] Successful create operation.
✔  functions[sendMissedDoseNotification(us-central1)] Successful create operation.

Function URL (scheduledDoseCheck): https://us-central1-YOUR_PROJECT.cloudfunctions.net/scheduledDoseCheck
```

---

## Step 6: Verify Deployment (Manual - 5 minutes)

### Check Cloud Functions:

1. Go to [Cloud Functions Console](https://console.cloud.google.com/functions)
2. You should see:
   - `scheduledDoseCheck`
   - `sendMissedDoseNotification`
3. Click on `scheduledDoseCheck` to view details

### Check Cloud Scheduler:

1. Go to [Cloud Scheduler Console](https://console.cloud.google.com/cloudscheduler)
2. You should see a job named: `firebase-schedule-scheduledDoseCheck-us-central1`
3. Verify:
   - Schedule: `*/5 * * * *` (every 5 minutes)
   - Status: **Enabled**
   - Target: Cloud Function `scheduledDoseCheck`

### Check Logs:

```bash
# View function logs
firebase functions:log --only scheduledDoseCheck

# Or in Cloud Console
# https://console.cloud.google.com/logs
```

---

## Step 7: Test the Setup (Manual - 10 minutes)

### Create Test Data:

1. Go to [Firestore Console](https://console.firebase.google.com/project/YOUR_PROJECT/firestore)
2. Create a test dose:

```javascript
Collection: doses
Document ID: test-dose-1
Fields:
{
  parentId: "test-parent-123",
  medicineId: "test-medicine-456",
  scheduledTime: <timestamp 35 minutes ago>,
  status: "pending",
  createdAt: <current timestamp>
}
```

3. Create a test medicine:

```javascript
Collection: medicines
Document ID: test-medicine-456
Fields:
{
  name: "Test Medicine",
  isActive: true,
  parentId: "test-parent-123"
}
```

4. Create a test user:

```javascript
Collection: users
Document ID: test-parent-123
Fields:
{
  displayName: "Test Parent",
  role: "parent"
}
```

### Trigger Function Manually:

```bash
# Trigger the function
gcloud functions call scheduledDoseCheck --region=us-central1
```

Or wait 5 minutes for the scheduler to run automatically.

### Verify Results:

1. Check the test dose in Firestore:

   - `status` should be `"missed"`
   - `missedAt` should have a timestamp
   - `escalatedAt` should have a timestamp

2. Check escalationLogs collection:

   - Should have a new document
   - Should show notification attempt

3. Check function logs:
   ```bash
   firebase functions:log --only scheduledDoseCheck
   ```

---

## Troubleshooting

### Error: "Billing account not configured"

**Solution:** Complete Step 1 (Enable Blaze plan)

### Error: "Cloud Build API not enabled"

**Solution:** Complete Step 2 (Enable APIs)

### Error: "Permission denied"

**Solution:**

```bash
firebase login --reauth
```

### Scheduler Not Running

**Check status:**

```bash
gcloud scheduler jobs describe firebase-schedule-scheduledDoseCheck-us-central1 --location=us-central1
```

**Manually trigger:**

```bash
gcloud scheduler jobs run firebase-schedule-scheduledDoseCheck-us-central1 --location=us-central1
```

### Function Timeout

**Increase timeout in functions/src/scheduledDoseCheck.js:**

```javascript
exports.scheduledDoseCheck = functions
  .runWith({ timeoutSeconds: 120 }) // Increase from default 60
  .pubsub.schedule('*/5 * * * *');
// ...
```

---

## Next Steps After Setup

Once setup is complete and verified:

1. ✅ Continue with Task 5.2: Test Cloud Functions
2. ✅ Update Firestore security rules (Task 5.3)
3. ✅ Update app FCM handler (Task 5.4)
4. ✅ Build adherence dashboard UI (Task 5.5)

---

## Summary Checklist

- [ ] Blaze plan enabled
- [ ] Budget alert set ($10/month)
- [ ] All 4 APIs enabled
- [ ] Dependencies installed (`npm install` in functions/)
- [ ] Functions deployed (`firebase deploy --only functions`)
- [ ] Cloud Scheduler job created and enabled
- [ ] Test data created in Firestore
- [ ] Function manually triggered
- [ ] Test dose marked as "missed"
- [ ] escalationLogs collection created
- [ ] Function logs show successful execution

---

## Estimated Costs

**Development (with testing):**

- Cloud Scheduler: $0 (free tier)
- Cloud Functions: $0 (free tier - 2M invocations/month)
- Firestore: ~$1-2/month
- **Total: ~$1-2/month**

**Note:** The free tier is very generous. You're unlikely to exceed it during development.

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review function logs: `firebase functions:log`
3. Check [Firebase Status](https://status.firebase.google.com/)
4. Consult [Firebase Support](https://firebase.google.com/support)

---

**Ready to begin? Start with Step 1!**
