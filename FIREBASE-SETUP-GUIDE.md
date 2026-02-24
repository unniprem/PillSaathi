# PillSathi Firebase Setup Guide

Version: 1.0
Date: 2026-02-16

---

## Overview

This guide covers all Firebase configuration needed for PillSathi across all phases.

---

## 1. Firebase Project Setup

### Create Projects

Create two Firebase projects:

- `pillsathi-dev` (Development)
- `pillsathi-prod` (Production)

### Steps

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name
4. Disable Google Analytics (optional for dev)
5. Create project

---

## 2. Firebase Authentication Setup

### Enable Phone Authentication

1. In Firebase Console → Authentication → Sign-in method
2. Enable "Phone" provider
3. Configure reCAPTCHA (for web testing)
4. For production: Set up App Verification
   - Android: Add SHA-256 fingerprint
   - iOS: Enable APNs

### Test Phone Numbers (Dev Only)

Add test phone numbers for development:

1. Authentication → Sign-in method → Phone
2. Scroll to "Phone numbers for testing"
3. Add: `+1234567890` with code `123456`

---

## 3. Firestore Database Setup

### Create Database

1. Firestore Database → Create database
2. Start in **test mode** initially
3. Choose location (closest to users)
4. Click "Enable"

### Collections Structure

Create these collections (will be auto-created by app, but good to know):

```
users/
  {uid}/
    - phone: string
    - role: "parent" | "caregiver"
    - language: string
    - createdAt: timestamp
    - updatedAt: timestamp

relationships/
  {relationshipId}/
    - parentId: string (ref to users)
    - caregiverId: string (ref to users)
    - active: boolean
    - createdAt: timestamp

medicines/
  {medicineId}/
    - parentId: string (ref to users)
    - name: string
    - dosage: string
    - active: boolean
    - createdAt: timestamp
    - updatedAt: timestamp

schedules/
  {scheduleId}/
    - medicineId: string (ref to medicines)
    - times: array of strings ["09:00", "21:00"]
    - repeat: "daily" | "custom"
    - daysOfWeek: array [0,1,2,3,4,5,6] (optional)
    - active: boolean
    - createdAt: timestamp

doses/
  {doseId}/
    - parentId: string (ref to users)
    - medicineId: string (ref to medicines)
    - scheduledAt: timestamp
    - status: "pending" | "taken" | "missed"
    - takenAt: timestamp (optional)
    - createdAt: timestamp

inviteCodes/
  {code}/
    - parentId: string (ref to users)
    - expiresAt: timestamp
    - used: boolean
    - usedBy: string (optional, ref to users)
    - createdAt: timestamp

deviceTokens/
  {tokenId}/
    - userId: string (ref to users)
    - token: string (FCM token)
    - platform: "android" | "ios"
    - active: boolean
    - lastUsed: timestamp
    - createdAt: timestamp
```

### Indexes

Create composite indexes:

1. **doses** collection:

   - Fields: `status` (Ascending), `scheduledAt` (Ascending)
   - Query scope: Collection

2. **doses** collection:

   - Fields: `parentId` (Ascending), `scheduledAt` (Descending)
   - Query scope: Collection

3. **relationships** collection:

   - Fields: `parentId` (Ascending), `active` (Ascending)
   - Query scope: Collection

4. **relationships** collection:
   - Fields: `caregiverId` (Ascending), `active` (Ascending)
   - Query scope: Collection

To create indexes:

1. Firestore → Indexes → Composite
2. Click "Create index"
3. Add fields as specified above

---

## 4. Firestore Security Rules

### Initial Rules (Phase 0-1)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isUser(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isParent() {
      return getUserRole() == 'parent';
    }

    function isCaregiver() {
      return getUserRole() == 'caregiver';
    }

    // Users collection
    match /users/{userId} {
      allow read: if isUser(userId);
      allow create: if isUser(userId) &&
                      request.resource.data.role in ['parent', 'caregiver'];
      allow update: if isUser(userId) &&
                      request.resource.data.role == resource.data.role; // Role immutable
    }

    // Device tokens
    match /deviceTokens/{tokenId} {
      allow read, write: if isAuthenticated() &&
                            resource.data.userId == request.auth.uid;
    }

    // Invite codes
    match /inviteCodes/{code} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && isParent() &&
                      request.resource.data.parentId == request.auth.uid;
      allow update: if isAuthenticated() && isCaregiver() &&
                      !resource.data.used; // Can only mark as used once
    }

    // Relationships
    match /relationships/{relationshipId} {
      allow read: if isAuthenticated() && (
        resource.data.parentId == request.auth.uid ||
        resource.data.caregiverId == request.auth.uid
      );
      allow create: if isAuthenticated() && (
        (isParent() && request.resource.data.parentId == request.auth.uid) ||
        (isCaregiver() && request.resource.data.caregiverId == request.auth.uid)
      );
      allow update, delete: if isAuthenticated() && (
        resource.data.parentId == request.auth.uid ||
        resource.data.caregiverId == request.auth.uid
      );
    }

    // Medicines
    match /medicines/{medicineId} {
      allow read: if isAuthenticated() && (
        resource.data.parentId == request.auth.uid || // Parent can read their own
        exists(/databases/$(database)/documents/relationships/$(request.auth.uid + '_' + resource.data.parentId)) // Caregiver can read if linked
      );
      allow create, update, delete: if isAuthenticated() && isCaregiver() &&
        exists(/databases/$(database)/documents/relationships/$(request.auth.uid + '_' + request.resource.data.parentId));
    }

    // Schedules
    match /schedules/{scheduleId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated() && isCaregiver();
    }

    // Doses
    match /doses/{doseId} {
      allow read: if isAuthenticated() && (
        resource.data.parentId == request.auth.uid || // Parent can read their own
        exists(/databases/$(database)/documents/relationships/$(request.auth.uid + '_' + resource.data.parentId)) // Caregiver can read if linked
      );
      allow create: if isAuthenticated(); // Cloud Functions create doses
      allow update: if isAuthenticated() && (
        (isParent() && resource.data.parentId == request.auth.uid) || // Parent can mark taken
        request.auth.token.admin == true // Cloud Functions can update
      );
    }
  }
}
```

To deploy:

1. Firestore → Rules
2. Paste the rules above
3. Click "Publish"

---

## 5. Firebase Cloud Functions Setup

### Initialize Functions

```bash
cd your-project-directory
firebase init functions
```

Select:

- TypeScript
- ESLint
- Install dependencies

### Project Structure

```
functions/
  src/
    index.ts
    scheduledDoseCheck.ts
    userManagement.ts
    notifications.ts
  package.json
  tsconfig.json
```

### Install Dependencies

```bash
cd functions
npm install firebase-admin firebase-functions
npm install @types/node --save-dev
```

### Environment Configuration

```bash
firebase functions:config:set fcm.server_key="YOUR_FCM_SERVER_KEY"
```

---

## 6. Cloud Functions Implementation

### functions/src/index.ts

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export { scheduledDoseCheck } from './scheduledDoseCheck';
export { onUserCreated } from './userManagement';
export { sendMissedDoseNotification } from './notifications';
```

### functions/src/scheduledDoseCheck.ts

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const scheduledDoseCheck = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async context => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const thirtyMinutesAgo = new Date(now.toMillis() - 30 * 60 * 1000);

    // Find overdue pending doses
    const overdueQuery = await db
      .collection('doses')
      .where('status', '==', 'pending')
      .where(
        'scheduledAt',
        '<',
        admin.firestore.Timestamp.fromDate(thirtyMinutesAgo),
      )
      .get();

    const batch = db.batch();
    const notifications: Array<{ parentId: string; medicineId: string }> = [];

    overdueQuery.forEach(doc => {
      batch.update(doc.ref, {
        status: 'missed',
        updatedAt: now,
      });

      notifications.push({
        parentId: doc.data().parentId,
        medicineId: doc.data().medicineId,
      });
    });

    await batch.commit();

    // Send notifications to caregivers
    for (const notif of notifications) {
      await sendMissedDoseNotifications(notif.parentId, notif.medicineId);
    }

    console.log(`Processed ${overdueQuery.size} missed doses`);
    return null;
  });

async function sendMissedDoseNotifications(
  parentId: string,
  medicineId: string,
) {
  const db = admin.firestore();

  // Get parent info
  const parentDoc = await db.collection('users').doc(parentId).get();
  const parentName = parentDoc.data()?.phone || 'Parent';

  // Get medicine info
  const medicineDoc = await db.collection('medicines').doc(medicineId).get();
  const medicineName = medicineDoc.data()?.name || 'Medicine';

  // Get all caregivers for this parent
  const relationshipsQuery = await db
    .collection('relationships')
    .where('parentId', '==', parentId)
    .where('active', '==', true)
    .get();

  const caregiverIds = relationshipsQuery.docs.map(
    doc => doc.data().caregiverId,
  );

  // Get FCM tokens for all caregivers
  for (const caregiverId of caregiverIds) {
    const tokensQuery = await db
      .collection('deviceTokens')
      .where('userId', '==', caregiverId)
      .where('active', '==', true)
      .get();

    const tokens = tokensQuery.docs.map(doc => doc.data().token);

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: 'Missed Dose Alert',
          body: `${parentName} missed ${medicineName}`,
        },
        data: {
          type: 'missed_dose',
          parentId: parentId,
          medicineId: medicineId,
        },
        tokens: tokens,
      };

      await admin.messaging().sendMulticast(message);
    }
  }
}
```

### functions/src/userManagement.ts

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onUserCreated = functions.auth.user().onCreate(async user => {
  const db = admin.firestore();

  // Create user document if it doesn't exist
  const userRef = db.collection('users').doc(user.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    await userRef.set(
      {
        phone: user.phoneNumber,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return null;
});
```

### Deploy Functions

```bash
firebase deploy --only functions
```

---

## 7. Firebase Cloud Messaging (FCM) Setup

### Android Configuration

1. In Firebase Console → Project Settings → General
2. Add Android app
3. Enter package name (e.g., `com.pillsathi`)
4. Download `google-services.json`
5. Place in `android/app/`

### iOS Configuration

1. In Firebase Console → Project Settings → General
2. Add iOS app
3. Enter bundle ID (e.g., `com.pillsathi`)
4. Download `GoogleService-Info.plist`
5. Place in `ios/PillSathi/`
6. Upload APNs certificate:
   - Project Settings → Cloud Messaging → iOS
   - Upload APNs Authentication Key

---

## 8. Firebase Storage (Optional - Future)

If you need to store images (medicine photos, etc.):

1. Storage → Get Started
2. Start in test mode
3. Set up security rules later

---

## 9. Environment Variables

Create `.env` files for your React Native app:

### .env.development

```
FIREBASE_API_KEY=your_dev_api_key
FIREBASE_AUTH_DOMAIN=pillsathi-dev.firebaseapp.com
FIREBASE_PROJECT_ID=pillsathi-dev
FIREBASE_STORAGE_BUCKET=pillsathi-dev.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### .env.production

```
FIREBASE_API_KEY=your_prod_api_key
FIREBASE_AUTH_DOMAIN=pillsathi-prod.firebaseapp.com
FIREBASE_PROJECT_ID=pillsathi-prod
FIREBASE_STORAGE_BUCKET=pillsathi-prod.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

---

## 10. Monitoring & Analytics

### Enable Crashlytics

1. Firebase Console → Crashlytics
2. Follow setup instructions for React Native

### Enable Performance Monitoring

1. Firebase Console → Performance
2. Follow setup instructions for React Native

### Set Up Alerts

1. Firebase Console → Alerts
2. Configure alerts for:
   - Authentication failures
   - Cloud Function errors
   - High latency
   - Budget alerts

---

## 11. Testing

### Firestore Emulator (Local Development)

```bash
firebase init emulators
```

Select:

- Authentication
- Firestore
- Functions

Start emulators:

```bash
firebase emulators:start
```

Update app to use emulators in development:

```typescript
if (__DEV__) {
  firestore().useEmulator('localhost', 8080);
  auth().useEmulator('http://localhost:9099');
  functions().useEmulator('localhost', 5001);
}
```

---

## 12. Backup & Recovery

### Enable Automated Backups

1. Firestore → Backups
2. Enable automated backups
3. Set retention period (30 days recommended)

### Export Data

```bash
gcloud firestore export gs://pillsathi-prod-backups
```

---

## 13. Cost Optimization

### Set Budget Alerts

1. Google Cloud Console → Billing → Budgets
2. Set monthly budget
3. Configure alerts at 50%, 90%, 100%

### Optimize Queries

- Use composite indexes
- Limit query results
- Cache frequently accessed data
- Use pagination

### Monitor Usage

- Firestore: Document reads/writes
- Cloud Functions: Invocations and compute time
- FCM: Messages sent
- Authentication: Active users

---

## 14. Security Checklist

- [ ] Enable App Check (production)
- [ ] Review and test security rules
- [ ] Rotate API keys regularly
- [ ] Enable 2FA for Firebase Console access
- [ ] Restrict API key usage (Android/iOS only)
- [ ] Set up VPC for Cloud Functions (if needed)
- [ ] Enable audit logs
- [ ] Review IAM permissions

---

## 15. Deployment Checklist

### Before Production Launch

- [ ] Switch Firestore to production mode
- [ ] Deploy production security rules
- [ ] Test all Cloud Functions
- [ ] Verify FCM works on real devices
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy
- [ ] Load test critical paths
- [ ] Review billing and set budgets
- [ ] Enable Crashlytics
- [ ] Document runbooks for incidents

---

## Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions](https://firebase.google.com/docs/functions)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)

---

End of Firebase Setup Guide
