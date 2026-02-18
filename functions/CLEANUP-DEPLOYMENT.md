# Dose Cleanup Cloud Function - Deployment Guide

## Overview

The `scheduledCleanupOldDoses` Cloud Function automatically deletes dose records older than 30 days to maintain database performance and reduce storage costs. This function runs daily at 2:00 AM UTC.

## Requirements

- Firebase project with Cloud Functions enabled
- Cloud Scheduler API enabled in Google Cloud Console
- Firestore database with `doses` collection

## Deployment Steps

### 1. Deploy the Cloud Function

Deploy the function to Firebase:

```bash
cd functions
firebase deploy --only functions:scheduledCleanupOldDoses
```

### 2. Verify Cloud Scheduler Job

The function uses the `functions.pubsub.schedule()` API, which automatically creates a Cloud Scheduler job when deployed. Verify the job was created:

```bash
gcloud scheduler jobs list
```

You should see a job named `firebase-schedule-scheduledCleanupOldDoses`.

### 3. Configure Schedule (Optional)

The default schedule is `0 2 * * *` (daily at 2:00 AM UTC). To change the schedule:

**Option A: Update the code**

Edit `functions/index.js` and change the schedule string:

```javascript
exports.scheduledCleanupOldDoses = functions.pubsub
  .schedule('0 3 * * *') // Run daily at 3:00 AM UTC
  .timeZone('UTC')
  .onRun(async _context => {
    // ...
  });
```

Then redeploy:

```bash
firebase deploy --only functions:scheduledCleanupOldDoses
```

**Option B: Update via gcloud CLI**

```bash
gcloud scheduler jobs update pubsub firebase-schedule-scheduledCleanupOldDoses \
  --schedule="0 3 * * *" \
  --time-zone="UTC"
```

### 4. Test the Function

Manually trigger the function to test it:

```bash
gcloud scheduler jobs run firebase-schedule-scheduledCleanupOldDoses
```

Check the logs to verify execution:

```bash
firebase functions:log --only scheduledCleanupOldDoses
```

## Schedule Format

The schedule uses cron format:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Examples:**

- `0 2 * * *` - Daily at 2:00 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 1 1 * *` - Monthly on the 1st at 1:00 AM

## Monitoring

### View Logs

View function execution logs:

```bash
firebase functions:log --only scheduledCleanupOldDoses --limit 50
```

### Check Execution History

View Cloud Scheduler job history in Google Cloud Console:

1. Go to [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler)
2. Click on `firebase-schedule-scheduledCleanupOldDoses`
3. View execution history and logs

### Set Up Alerts

Create alerts for function failures:

1. Go to [Cloud Monitoring](https://console.cloud.google.com/monitoring)
2. Create an alert policy for Cloud Function errors
3. Set notification channels (email, SMS, etc.)

## Cost Considerations

### Cloud Functions Pricing

- **Invocations**: 1 invocation per day = ~30 invocations/month (within free tier)
- **Compute time**: Depends on number of doses deleted
- **Free tier**: 2 million invocations/month, 400,000 GB-seconds/month

### Cloud Scheduler Pricing

- **Jobs**: 1 job = $0.10/month (first 3 jobs are free)
- **Free tier**: 3 jobs per month

### Firestore Pricing

- **Reads**: 1 read per dose queried
- **Deletes**: 1 delete per dose removed
- **Free tier**: 50,000 reads/day, 20,000 writes/day

**Example cost calculation:**

If you have 1,000 old doses per day:

- Reads: 1,000 reads/day = 30,000 reads/month (within free tier)
- Deletes: 1,000 deletes/day = 30,000 deletes/month (within free tier)
- Function invocations: 30/month (within free tier)

**Total estimated cost: $0.00/month** (within free tiers)

## Troubleshooting

### Function Not Running

1. Check if Cloud Scheduler job exists:

   ```bash
   gcloud scheduler jobs list
   ```

2. Check job status:

   ```bash
   gcloud scheduler jobs describe firebase-schedule-scheduledCleanupOldDoses
   ```

3. Manually trigger the job:
   ```bash
   gcloud scheduler jobs run firebase-schedule-scheduledCleanupOldDoses
   ```

### Function Errors

1. Check function logs:

   ```bash
   firebase functions:log --only scheduledCleanupOldDoses
   ```

2. Common errors:
   - **Permission denied**: Ensure Cloud Scheduler API is enabled
   - **Timeout**: Increase function timeout in `functions/index.js`
   - **Out of memory**: Increase memory allocation

### No Doses Being Deleted

1. Verify doses exist older than 30 days:

   ```javascript
   // Run in Firestore console
   const cutoff = new Date();
   cutoff.setDate(cutoff.getDate() - 30);

   db.collection('doses')
     .where('scheduledTime', '<', cutoff)
     .limit(10)
     .get()
     .then(snapshot => console.log(snapshot.size));
   ```

2. Check function logs for execution details

## Maintenance

### Adjust Retention Period

To change the 30-day retention period, edit `functions/cleanupOldDoses.js`:

```javascript
const DAYS_TO_KEEP = 60; // Change from 30 to 60 days
```

Then redeploy:

```bash
firebase deploy --only functions:scheduledCleanupOldDoses
```

### Pause Cleanup

To temporarily pause cleanup without deleting the function:

```bash
gcloud scheduler jobs pause firebase-schedule-scheduledCleanupOldDoses
```

To resume:

```bash
gcloud scheduler jobs resume firebase-schedule-scheduledCleanupOldDoses
```

### Delete Function

To remove the function and scheduler job:

```bash
firebase functions:delete scheduledCleanupOldDoses
```

## Security Considerations

- The function runs with Firebase Admin SDK privileges
- No user authentication required (scheduled function)
- Ensure Firestore security rules prevent unauthorized dose creation
- Monitor function logs for suspicious activity

## References

- [Cloud Functions Scheduled Functions](https://firebase.google.com/docs/functions/schedule-functions)
- [Cloud Scheduler Documentation](https://cloud.google.com/scheduler/docs)
- [Cron Format Reference](https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules)
- [Firebase Functions Pricing](https://firebase.google.com/pricing)
