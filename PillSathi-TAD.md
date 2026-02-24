# PillSathi --- Technical Architecture Document (TAD)

Version: 1.0\
Date: 2026-02-16

---

## 1. System Overview

PillSathi is a single React Native application supporting two roles:

- Parent (receives reminders, marks Taken)
- Caregiver (adds medicines, monitors adherence)

Backend uses Firebase services:

- Firebase Auth (Phone OTP)
- Firestore (primary database)
- Firebase Cloud Functions (missed-dose detection)
- Firebase Cloud Messaging (caretaker alerts)
- Notifee (local alarm notifications)

---

## 2. High-Level Architecture

Mobile App (React Native) ↓\
Firebase Auth\
↓\
Firestore\
↓\
Cloud Functions\
↓\
FCM Push Notifications

Local alarms are handled directly on device using Notifee.

---

## 3. Core Data Flow

### Registration

1.  User logs in with Phone OTP
2.  User document created in Firestore
3.  Device FCM token registered

### Pairing

1.  Parent generates invite code
2.  Caregiver enters code
3.  Relationship record created

### Medicine Setup

1.  Caregiver creates medicine + schedule
2.  Parent device listens and schedules alarms

### Reminder

1.  Notifee fires alarm
2.  Parent taps TAKEN
3.  Dose updated in Firestore

### Escalation

1.  Cloud Function runs every 5 minutes
2.  Finds overdue pending doses
3.  Marks missed
4.  Sends FCM to all caregivers

---

## 4. Firestore Collections

users\
relationships\
medicines\
schedules\
doses\
inviteCodes\
deviceTokens

---

## 5. Cloud Functions

### scheduledDoseCheck (cron)

Runs every 5 minutes:

- Query doses where: status == pending now \> scheduledAt + 30 minutes

Actions: - Update dose.status = missed - Fetch caregivers via
relationships - Fetch FCM tokens - Send push notifications

---

## 6. Notification Strategy

Parent: - Local alarm (Notifee)

Caregiver: - Remote push (FCM)

---

## 7. Offline Support

Firestore offline persistence enabled.

Parent can mark TAKEN offline. Sync occurs automatically when network
returns.

---

## 8. Security

- Role immutable after signup
- Parents can only read/write their own doses
- Caregivers can only access linked parents
- Escalation updates only via Cloud Functions

---

## 9. Deployment

- Firebase project per environment (dev / prod)
- Cloud Functions deployed via Firebase CLI
- Android & iOS builds via standard CI

---

## 10. Future Scalability

- Migrate Firestore → Supabase/Postgres if needed
- Add ESP32 pillbox integration
- Add WhatsApp alerts

---

End of Technical Architecture Document
