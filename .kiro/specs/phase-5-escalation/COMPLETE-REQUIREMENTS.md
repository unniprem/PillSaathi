# Phase 5: Complete Requirements - Cloud Functions Approach

Version: 1.0
Date: 2026-02-21

---

## Executive Summary

Phase 5 implements a reliable, no-compromise escalation system using Cloud Functions and Cloud Scheduler. This ensures missed doses are detected within 5 minutes and caregivers are notified immediately via push notifications.

---

## What You Need

### 1. Cloud Scheduler

- **Quantity:** 1 job
- **Name:** `check-missed-doses` (auto-created by Cloud Function)
- **Frequency:** Every 5 minutes (`*/5 * * * *`)
- **Purpose:** Triggers the dose checking function
- **Cost:** Free (first 3 jobs free)

### 2. Cloud Functions

- **Quantity:** 2 functions
- **Functions:**
  1. `scheduledDoseCheck` - Main function (triggered by scheduler)
  2. `sendMissedDoseNotification` - Helper function (called by main function)
- **Runtime:** Node.js 18
- **Region:** us-central1 (default)
- **Cost:** Free tier covers 2M invocations/month

### 3. Firebase Services (Already Have)

- **Firestore:** Database for doses, users, medicines, relationships
- **Firebase Cloud Messaging (FCM):** Push notifications to caregivers
- **Firebase Authentication:** User management
- **Firebase Hosting:** (optional) For admin dashboard

### 4. New Firestore Collection

- **escalationLogs:** Tracks all escalation events for debugging and analytics

### 5. Device Token Management

- **deviceTokens collection:** Already exists from Phase 4
- Stores FCM tokens for all users
- Updated when app starts and on token refresh

### 6. Billing

- **Firebase Blaze Plan:** Required for Cloud Functions
- **Estimated Cost:** $1-5/month (dev), $10-20/month (prod with 1000 users)

---

## Architecture Flow

```
Every 5 minutes:
  Cloud Scheduler
    ↓
  scheduledDoseCheck Function
    ↓
  Query Firestore for overdue doses
    ↓
  For each missed dose:
    - Update dose status to 'missed'
    - Call sendMissedDoseNotification
      ↓
      Get parent & medicine details
      ↓
      Get all caregivers for parent
      ↓
      Get device tokens for caregivers
      ↓
      Send FCM multicast notification
      ↓
      Log to escalationLogs collection
```

---

## Files Created

### Cloud Functions

```
functions/
├── package.json                          # Dependencies
├── index.js                              # Main entry point
├── .gitignore                            # Git ignore
└── src/
    ├── scheduledDoseCheck.js             # Main scheduler function
    └── sendMissedDoseNotification.js     # Notification helper
```

### Documentation

```
.kiro/specs/phase-5-escalation/
├── requirements.md                       # Functional requirements
├── tasks.md                              # Implementation tasks
├── cloud-functions-setup.md              # Setup guide
└── COMPLETE-REQUIREMENTS.md              # This file
```

---

## Setup Checklist

### Prerequisites

- [ ] Firebase project created (dev and prod)
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Node.js 18+ installed
- [ ] Git repository set up

### Firebase Configuration

- [ ] Enable Blaze (pay-as-you-go) plan
- [ ] Enable Cloud Functions API
- [ ] Enable Cloud Scheduler API
- [ ] Enable Cloud Build API
- [ ] Enable Cloud Pub/Sub API
- [ ] Set budget alerts ($10/month for dev)

### Cloud Functions Deployment

- [ ] Install dependencies: `cd functions && npm install`
- [ ] Update firebase.json with functions config
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Verify Cloud Scheduler job created
- [ ] Test manual function trigger
- [ ] Monitor logs for errors

### Firestore Configuration

- [ ] Add escalationLogs security rules
- [ ] Deploy security rules: `firebase deploy --only firestore:rules`
- [ ] Add Firestore indexes for doses query
- [ ] Deploy indexes: `firebase deploy --only firestore:indexes`
- [ ] Verify indexes created

### Testing

- [ ] Create test dose 35 minutes in the past
- [ ] Wait for scheduler to run (max 5 minutes)
- [ ] Verify dose status changed to 'missed'
- [ ] Verify caregiver received FCM notification
- [ ] Check escalationLogs collection populated
- [ ] Review function logs for errors
- [ ] Test with multiple caregivers
- [ ] Test with no device tokens (graceful handling)

### Monitoring

- [ ] Set up Cloud Monitoring dashboard
- [ ] Create alert for function failures
- [ ] Create alert for high execution time
- [ ] Create alert for scheduler failures
- [ ] Create alert for budget threshold
- [ ] Document monitoring procedures

---

## Key Benefits vs Client-Side Approach

| Aspect               | Cloud Functions   | Client-Side        |
| -------------------- | ----------------- | ------------------ |
| **Reliability**      | 99.95% uptime SLA | Depends on device  |
| **Latency**          | 2-5 minutes       | 10-30 minutes      |
| **Battery Impact**   | None              | Moderate           |
| **Offline Handling** | Works always      | Fails when offline |
| **Scalability**      | Automatic         | Limited by device  |
| **Maintenance**      | Centralized       | Per device         |
| **Cost**             | $10-20/month      | Free               |
| **Complexity**       | Higher setup      | Lower setup        |

**Verdict:** Cloud Functions provide enterprise-grade reliability with minimal cost.

---

## Performance Metrics

### Expected Performance

- **Detection Latency:** < 5 minutes (scheduler interval)
- **Notification Latency:** < 30 seconds (after detection)
- **Total Latency:** < 6 minutes (from missed to notified)
- **Success Rate:** > 99% (with retry logic)
- **False Positive Rate:** < 1%

### Monitoring Metrics

- Function invocation count (should be ~288/day)
- Function execution time (should be < 10 seconds)
- Function error rate (should be < 1%)
- Notification delivery rate (should be > 95%)
- Firestore read/write operations

---

## Cost Breakdown

### Development (Testing)

- **Cloud Scheduler:** $0 (free tier)
- **Cloud Functions:** $0 (free tier)
- **Firestore:** ~$1-2/month (low usage)
- **FCM:** $0 (free)
- **Total:** ~$1-2/month

### Production (1,000 users, ~50 doses/day missed)

- **Cloud Scheduler:** $0 (free tier)
- **Cloud Functions:** ~$0.50/month
  - 8,640 invocations/month (every 5 min)
  - ~10 seconds execution time
  - Well within free tier
- **Firestore:** ~$10-15/month
  - Reads: ~260K/month (doses queries)
  - Writes: ~1.5K/month (dose updates)
  - Storage: negligible
- **FCM:** $0 (free)
- **Total:** ~$10-15/month

### Production (10,000 users, ~500 doses/day missed)

- **Cloud Scheduler:** $0 (free tier)
- **Cloud Functions:** ~$2/month
- **Firestore:** ~$50-80/month
- **FCM:** $0 (free)
- **Total:** ~$50-80/month

---

## Security Considerations

### Cloud Functions Security

- Functions run with Firebase Admin SDK (full access)
- No direct user access to functions
- Only Cloud Scheduler can trigger scheduledDoseCheck
- Proper error handling prevents data leaks

### Firestore Security

- escalationLogs: Read-only for caregivers, write-only for functions
- doses: Caregivers can read, only parents can update status
- deviceTokens: Users can only access their own tokens
- relationships: Required for caregiver access

### FCM Security

- Device tokens stored securely in Firestore
- Tokens validated before sending
- Notifications include minimal data (IDs only)
- Full data fetched in app after notification tap

---

## Scalability

### Current Design Supports

- **Users:** Up to 100,000
- **Doses/day:** Up to 10,000 missed doses
- **Notifications:** Up to 50,000/day
- **Latency:** Consistent < 6 minutes

### Scaling Considerations

- **10K+ users:** Consider regional functions
- **100K+ users:** Implement batch processing
- **1M+ users:** Use Cloud Tasks for queuing
- **High notification volume:** Implement rate limiting

---

## Maintenance Plan

### Daily

- Monitor function logs for errors
- Check notification delivery rates

### Weekly

- Review escalationLogs for patterns
- Check Firestore costs
- Verify scheduler running correctly

### Monthly

- Review and optimize queries
- Update dependencies
- Check for unused indexes
- Review cost trends

### Quarterly

- Update Node.js runtime
- Review and adjust scheduler frequency
- Optimize function code
- Security audit

---

## Rollback Plan

If critical issues occur:

1. **Immediate:** Pause Cloud Scheduler

   ```bash
   gcloud scheduler jobs pause firebase-schedule-scheduledDoseCheck-us-central1 --location=us-central1
   ```

2. **Investigate:** Check logs and metrics

   ```bash
   firebase functions:log --only scheduledDoseCheck
   ```

3. **Fix:** Deploy corrected version

   ```bash
   firebase deploy --only functions
   ```

4. **Resume:** Re-enable scheduler
   ```bash
   gcloud scheduler jobs resume firebase-schedule-scheduledDoseCheck-us-central1 --location=us-central1
   ```

---

## Success Criteria

### Technical

- [ ] Cloud Functions deployed and running
- [ ] Cloud Scheduler triggering every 5 minutes
- [ ] Doses marked missed within 5 minutes
- [ ] Notifications delivered within 30 seconds
- [ ] Success rate > 99%
- [ ] No false positives
- [ ] Logs show clean execution

### Business

- [ ] < 25% of doses escalate (from PRD)
- [ ] Caregivers respond within 1 hour
- [ ] User satisfaction with alerts
- [ ] Adherence rate improves over time

### Operational

- [ ] Monitoring dashboard set up
- [ ] Alerts configured
- [ ] Documentation complete
- [ ] Team trained on troubleshooting
- [ ] Costs within budget

---

## Timeline

### Week 1: Setup & Deployment

- Days 1-2: Enable billing, APIs, deploy functions
- Days 3-4: Configure Firestore rules and indexes
- Day 5: Initial testing

### Week 2: Testing & Refinement

- Days 1-2: Comprehensive testing
- Days 3-4: Bug fixes and optimization
- Day 5: Monitoring setup

### Week 3: Production Deployment

- Days 1-2: Deploy to production
- Days 3-5: Monitor and stabilize

**Total: 3 weeks for Phase 5 backend**

(UI development for adherence dashboard can happen in parallel)

---

## Next Steps

1. **Review this document** with team
2. **Enable Blaze plan** in Firebase Console
3. **Follow cloud-functions-setup.md** for detailed steps
4. **Deploy to dev environment** first
5. **Test for 48 hours** before prod deployment
6. **Set up monitoring** and alerts
7. **Deploy to production** when stable
8. **Begin UI development** (adherence dashboard)

---

## Support & Resources

### Documentation

- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Cloud Scheduler](https://cloud.google.com/scheduler/docs)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

### Troubleshooting

- Check `cloud-functions-setup.md` for common issues
- Review function logs: `firebase functions:log`
- Monitor Cloud Console dashboards
- Contact Firebase Support (Blaze plan includes support)

---

End of Complete Requirements
