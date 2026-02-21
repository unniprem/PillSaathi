# Phase 5: Escalation System

**Version:** 2.0  
**Status:** Ready for Implementation  
**Approach:** Cloud Functions + Cloud Scheduler  
**Estimated Time:** 4-5 weeks

---

## Overview

Phase 5 implements a reliable, enterprise-grade escalation system that automatically detects missed doses and notifies caregivers via push notifications. The system uses Cloud Functions and Cloud Scheduler to ensure 99.95% uptime and < 5 minute detection latency.

---

## Architecture

```
Every 5 minutes:
  Cloud Scheduler
    ↓
  scheduledDoseCheck Function
    ↓
  Query Firestore for overdue doses (>30 min past scheduled time)
    ↓
  For each missed dose:
    - Update dose status to 'missed'
    - Call sendMissedDoseNotification
      ↓
      Get parent & medicine details
      ↓
      Get all caregivers for parent
      ↓
      Get FCM device tokens
      ↓
      Send FCM multicast notification
      ↓
      Log to escalationLogs collection
```

---

## What's Included

### Cloud Functions (Backend)

- ✅ `scheduledDoseCheck` - Detects missed doses every 5 minutes
- ✅ `sendMissedDoseNotification` - Sends FCM notifications to caregivers
- ✅ Automatic Cloud Scheduler job creation
- ✅ Error handling and logging
- ✅ Batch processing for efficiency

### App Features (Frontend)

- 📱 Adherence Dashboard - View parent adherence metrics
- 📱 Missed Doses List - See all missed doses with filters
- 📱 FCM Notification Handler - Handle missed dose alerts
- 📱 Adherence Calculations - Hooks and utilities

### Data Model

- 📊 `escalationLogs` collection - Track all escalation events
- 📊 Updated `doses` collection - Add missedAt, escalatedAt fields
- 📊 Security rules for caregiver access

---

## Documents

### Core Documents

1. **requirements.md** - Complete functional and technical requirements
2. **tasks.md** - Detailed implementation tasks with acceptance criteria
3. **SETUP-INSTRUCTIONS.md** - Step-by-step setup guide (START HERE!)
4. **cloud-functions-setup.md** - Comprehensive Cloud Functions guide
5. **COMPLETE-REQUIREMENTS.md** - Executive summary and cost estimates
6. **README.md** - This file

### Code Files

- `functions/package.json` - Dependencies
- `functions/index.js` - Entry point
- `functions/src/scheduledDoseCheck.js` - Main scheduler function
- `functions/src/sendMissedDoseNotification.js` - Notification helper

---

## Quick Start

### Prerequisites

- ✅ Phase 4 completed (dose tracking working)
- ✅ FCM configured in app
- ✅ Device tokens registered
- ⚠️ Firebase Blaze plan (needs to be enabled)
- ⚠️ Cloud APIs enabled (needs to be done)

### Setup Steps

1. **Read SETUP-INSTRUCTIONS.md** (30-45 minutes)

   - Enable Firebase Blaze plan
   - Enable Cloud APIs
   - Install dependencies
   - Deploy functions
   - Test deployment

2. **Follow tasks.md** (4-5 weeks)
   - Test Cloud Functions (1-2 days)
   - Update security rules (1 day)
   - Update app FCM handler (1-2 days)
   - Build adherence dashboard (4-5 days)
   - Build missed doses list (2-3 days)
   - Testing & QA (3-4 days)
   - Production deployment (1-2 days)

---

## Key Features

### Missed Dose Detection

- ✅ Automatic detection every 5 minutes
- ✅ 30-minute grace period
- ✅ Only checks active medicines
- ✅ Handles timezone correctly
- ✅ Batch processing for efficiency

### Caregiver Notifications

- ✅ FCM push notifications
- ✅ Multicast to all caregivers
- ✅ Includes parent name, medicine name, time
- ✅ Opens app to dose history
- ✅ Retry logic built into FCM

### Adherence Dashboard

- ✅ View adherence percentage
- ✅ Filter by time period (7d, 30d, all)
- ✅ Per-medicine breakdown
- ✅ Visual indicators
- ✅ Multiple parent support

### Missed Doses List

- ✅ See all missed doses
- ✅ Filter by parent, medicine, date
- ✅ Sort by most recent
- ✅ Pagination support
- ✅ Empty state handling

---

## Benefits vs Client-Side Approach

| Aspect               | Cloud Functions   | Client-Side        |
| -------------------- | ----------------- | ------------------ |
| **Reliability**      | 99.95% uptime SLA | Depends on device  |
| **Latency**          | 2-5 minutes       | 10-30 minutes      |
| **Battery Impact**   | None              | Moderate           |
| **Offline Handling** | Works always      | Fails when offline |
| **Scalability**      | Automatic         | Limited by device  |
| **Maintenance**      | Centralized       | Per device         |
| **Cost**             | $10-20/month      | Free               |
| **Setup Complexity** | Higher            | Lower              |

**Verdict:** Cloud Functions provide enterprise-grade reliability with minimal cost.

---

## Cost Estimates

### Development

- Cloud Scheduler: $0 (free tier)
- Cloud Functions: $0 (free tier - 2M invocations/month)
- Firestore: ~$1-2/month
- **Total: ~$1-2/month**

### Production (1,000 users)

- Cloud Scheduler: $0 (free tier)
- Cloud Functions: ~$0.50/month (8,640 invocations/month)
- Firestore: ~$10-15/month
- FCM: $0 (free)
- **Total: ~$10-15/month**

### Production (10,000 users)

- Cloud Scheduler: $0 (free tier)
- Cloud Functions: ~$2/month
- Firestore: ~$50-80/month
- FCM: $0 (free)
- **Total: ~$50-80/month**

---

## Success Metrics

### Technical

- ✅ Escalation latency < 5 minutes
- ✅ Notification delivery rate > 95%
- ✅ Cloud Function success rate > 99%
- ✅ False positive rate < 1%
- ✅ Function execution time < 30 seconds

### Business

- ✅ < 25% of doses escalate (from PRD)
- ✅ Caregivers respond within 1 hour
- ✅ Adherence rate improves over time
- ✅ User satisfaction with alerts

---

## Timeline

### Week 1: Backend Setup

- Enable Blaze plan and APIs
- Deploy Cloud Functions
- Test escalation flow
- Update security rules

### Week 2: App Integration

- Update FCM handler
- Test notifications
- Start adherence dashboard

### Week 3: UI Development

- Finish adherence dashboard
- Build missed doses list
- Adherence calculations

### Week 4: Testing & QA

- Unit tests
- Integration tests
- Device testing
- Performance testing

### Week 5: Production

- Deploy to production
- Monitor metrics
- Documentation
- Stabilize

---

## Next Steps

1. **Read SETUP-INSTRUCTIONS.md** - Start here!
2. **Enable Blaze plan** - Required for Cloud Functions
3. **Deploy functions** - Follow setup guide
4. **Test deployment** - Verify everything works
5. **Continue with tasks.md** - Build UI features

---

## Support & Resources

### Documentation

- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Cloud Scheduler](https://cloud.google.com/scheduler/docs)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

### Troubleshooting

- Check SETUP-INSTRUCTIONS.md troubleshooting section
- Review function logs: `firebase functions:log`
- Check cloud-functions-setup.md for detailed guides

### Files to Review

1. **SETUP-INSTRUCTIONS.md** - Setup guide (START HERE!)
2. **requirements.md** - Full requirements
3. **tasks.md** - Implementation tasks
4. **cloud-functions-setup.md** - Detailed Cloud Functions guide

---

## Questions?

- Review the requirements.md for functional details
- Check tasks.md for implementation steps
- Read SETUP-INSTRUCTIONS.md for setup help
- Consult cloud-functions-setup.md for Cloud Functions specifics

---

**Ready to begin? Open SETUP-INSTRUCTIONS.md and start with Step 1!**
