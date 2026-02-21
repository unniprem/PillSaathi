# Phase 5: Cloud Functions Setup Guide

Version: 1.0
Date: 2026-02-21

---

## Overview

This guide covers setting up Cloud Functions and Cloud Scheduler for the Phase 5 escalation system.

---

## Prerequisites

- Firebase project created (dev and prod)
- Firebase CLI installed (`npm install -g firebase-tools`)
- Blaze (pay-as-you-go) plan enabled
- Node.js 18+ installed

---

## What You Need

### 1. Cloud Scheduler (1 job)

- **Name:** `check-missed-doses`
- **Frequency:** Every 5 minutes
- **Target:** Cloud Function `scheduledDoseCheck`
- **Cost:** Free (first 3 jobs free, then $0.10/job/month)

### 2. Cloud Functions (2 functions)

- **scheduledDoseCheck** - Main function triggered by scheduler
- **sendMissedDoseNotification** - Helper function to send FCM notifications
- **Cost:** Free tier includes 2M invocations/month, 400K GB-seconds, 200K GHz-seconds

### 3. Firebase Cloud Messaging (FCM)

- Already configured in Phase 4
- Device tokens stored in `deviceTokens` collection
- **Cost:** Free

### 4. Firestore

- Already configured
- New collection: `escalationLogs`
- **Cost:** Based on reads/writes (monitor usage)

---

## Setup Steps

### Step 1: Enable Billing (Blaze Plan)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click "Upgrade" in the left sidebar
4. Choose "Blaze" plan
5. Set up billing account
6. **Set budget alerts** (recommended: $10/month for dev, $50/month for prod)

### Step 2: Enable Required APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Enable the following APIs:
   - Cloud Functions API
   - Cloud Scheduler API
   - Cloud Build API (for deploying functions)
   - Cloud Pub/Sub API (for scheduler)

Or use CLI:

```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable pubsub.googleapis.com
```

### Step 3: Initialize Cloud Functions

```bash
# Navigate to project root
cd /path/to/PillSathi

# Install functions dependencies
cd functions
npm install

# Return to project root
cd ..
```

### Step 4: Configure Firebase

Update `firebase.json` to include functions:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "predeploy": [],
    "runtime": "nodejs18"
  }
}
```

### Step 5: Deploy Cloud Functions

```bash
# Login to Firebase (if not already)
firebase login

# Select your project
firebase use <project-id>

# Deploy functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:scheduledDoseCheck
```

Expected output:

```
✔  functions[scheduledDoseCheck(us-central1)] Successful create operation.
Function URL (scheduledDoseCheck): https://us-central1-<project-id>.cloudfunctions.net/scheduledDoseCheck
```

### Step 6: Verify Cloud Scheduler Created

The `scheduledDoseCheck` function automatically creates a Cloud Scheduler job because it uses `functions.pubsub.schedule()`.

Verify in Cloud Console:

1. Go to [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler)
2. You should see a job named `firebase-schedule-scheduledDoseCheck-us-central1`
3. Schedule: `*/5 * * * *` (every 5 minutes)
4. Status: Enabled

Or use CLI:

```bash
gcloud scheduler jobs list
```

### Step 7: Test the Function

#### Option A: Manual Trigger (Recommended for first test)

```bash
# Trigger the function manually
gcloud functions call scheduledDoseCheck --region=us-central1
```

#### Option B: Create Test Data

1. Create a test dose in Firestore:

```javascript
{
  parentId: "test-parent-id",
  medicineId: "test-medicine-id",
  scheduledTime: <timestamp 35 minutes ago>,
  status: "pending",
  // ... other fields
}
```

2. Wait 5 minutes for scheduler to run
3. Check function logs:

```bash
firebase functions:log --only scheduledDoseCheck
```

4. Verify dose status changed to "missed"

### Step 8: Monitor Function Execution

#### View Logs

```bash
# Real-time logs
firebase functions:log --only scheduledDoseCheck

# Or in Cloud Console
# https://console.cloud.google.com/logs
```

#### Check Metrics

1. Go to [Cloud Functions Console](https://console.cloud.google.com/functions)
2. Click on `scheduledDoseCheck`
3. View metrics: invocations, execution time, errors

#### Set Up Alerts

1. Go to [Cloud Monitoring](https://console.cloud.google.com/monitoring)
2. Create alert policies:
   - Function execution failures > 5% in 5 minutes
   - Function execution time > 30 seconds
   - Scheduler job failures

---

## Configuration

### Environment Variables (if needed)

```bash
# Set environment variables for functions
firebase functions:config:set notification.retry_count=3
firebase functions:config:set notification.timeout=10000

# View current config
firebase functions:config:get

# Deploy after config changes
firebase deploy --only functions
```

### Adjust Schedule Frequency

Edit `functions/src/scheduledDoseCheck.js`:

```javascript
// Every 5 minutes (default)
.schedule('*/5 * * * *')

// Every 10 minutes
.schedule('*/10 * * * *')

// Every 3 minutes
.schedule('*/3 * * * *')
```

Then redeploy:

```bash
firebase deploy --only functions:scheduledDoseCheck
```

---

## Firestore Security Rules

Add rules for escalationLogs collection in `firestore.rules`:

```javascript
match /escalationLogs/{logId} {
  // Only caregivers can read logs for their parents
  allow read: if isAuthenticated() &&
                 isCaregiverOfParent(resource.data.parentId);
  // Only Cloud Functions can write
  allow write: if false;
}

// Helper function
function isCaregiverOfParent(parentId) {
  return exists(/databases/$(database)/documents/relationships/$(request.auth.uid + '_' + parentId)) ||
         exists(/databases/$(database)/documents/relationships/$(parentId + '_' + request.auth.uid));
}
```

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

---

## Firestore Indexes

Add indexes for efficient queries in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "doses",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledTime", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "escalationLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "parentId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy indexes:

```bash
firebase deploy --only firestore:indexes
```

---

## Testing Checklist

- [ ] Cloud Functions deployed successfully
- [ ] Cloud Scheduler job created and enabled
- [ ] Manual function trigger works
- [ ] Function logs show execution
- [ ] Test dose marked as missed after 30 minutes
- [ ] FCM notifications sent to caregivers
- [ ] escalationLogs collection populated
- [ ] No errors in function logs
- [ ] Firestore rules allow caregiver reads
- [ ] Indexes created successfully

---

## Troubleshooting

### Function Not Deploying

**Error:** "Billing account not configured"

- **Solution:** Enable Blaze plan in Firebase Console

**Error:** "Cloud Build API not enabled"

- **Solution:** Enable Cloud Build API in Google Cloud Console

### Scheduler Not Running

**Check job status:**

```bash
gcloud scheduler jobs describe firebase-schedule-scheduledDoseCheck-us-central1 --location=us-central1
```

**Manually trigger:**

```bash
gcloud scheduler jobs run firebase-schedule-scheduledDoseCheck-us-central1 --location=us-central1
```

### Notifications Not Sending

**Check device tokens:**

```javascript
// In Firestore console, verify deviceTokens collection has entries
db.collection('deviceTokens')
  .where('userId', '==', '<caregiver-id>')
  .where('enabled', '==', true)
  .get();
```

**Check FCM permissions:**

- Verify FCM is enabled in Firebase Console
- Check app has notification permissions

### High Costs

**Monitor usage:**

```bash
# Check function invocations
gcloud functions describe scheduledDoseCheck --region=us-central1

# View billing
# Go to https://console.cloud.google.com/billing
```

**Optimize:**

- Reduce scheduler frequency (e.g., every 10 minutes instead of 5)
- Add caching for medicine lookups
- Batch Firestore operations
- Limit query results

---

## Cost Estimates

### Development Environment

- Cloud Scheduler: Free (first 3 jobs)
- Cloud Functions: Free tier (2M invocations/month)
- Firestore: ~$1-5/month (depends on usage)
- **Total: ~$1-5/month**

### Production Environment (1000 users)

- Cloud Scheduler: Free
- Cloud Functions: ~$0.50/month (8,640 invocations/month)
- Firestore: ~$10-20/month (reads/writes)
- FCM: Free
- **Total: ~$10-20/month**

### At Scale (10,000 users)

- Cloud Scheduler: Free
- Cloud Functions: ~$2/month
- Firestore: ~$50-100/month
- FCM: Free
- **Total: ~$50-100/month**

---

## Monitoring & Alerts

### Set Up Monitoring Dashboard

1. Go to [Cloud Monitoring](https://console.cloud.google.com/monitoring)
2. Create dashboard with:
   - Function invocation count
   - Function execution time
   - Function error rate
   - Scheduler job success rate
   - Firestore read/write operations

### Alert Policies

Create alerts for:

- Function error rate > 5%
- Function execution time > 30 seconds
- Scheduler job failures
- Firestore costs > budget threshold

---

## Maintenance

### Regular Tasks

**Weekly:**

- Check function logs for errors
- Monitor costs
- Review escalationLogs for patterns

**Monthly:**

- Review and optimize Firestore queries
- Check for unused indexes
- Update dependencies

**Quarterly:**

- Review and adjust scheduler frequency
- Optimize function code
- Update Node.js runtime if needed

---

## Rollback Plan

If issues occur:

```bash
# Disable scheduler
gcloud scheduler jobs pause firebase-schedule-scheduledDoseCheck-us-central1 --location=us-central1

# Or delete function
firebase functions:delete scheduledDoseCheck

# Redeploy previous version
git checkout <previous-commit>
firebase deploy --only functions
```

---

## Next Steps

1. Complete this setup in dev environment
2. Test thoroughly for 48 hours
3. Monitor logs and metrics
4. Repeat setup in prod environment
5. Enable monitoring and alerts
6. Document any issues and solutions

---

End of Setup Guide
