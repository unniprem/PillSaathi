# PillSathi --- Functional Requirements Document (FRD)

Version: 1.0\
Phase: v0+ (Lean MVP)\
Date: 2026-02-16

------------------------------------------------------------------------

## 1. Overview

PillSathi is a single mobile application (Android + iOS) supporting two
roles:

-   Parent (takes medicines)
-   Caregiver (monitors adherence)

Supports: - Multiple parents per caregiver - Multiple caregivers per
parent - Multiple medicines per parent - Frequency with multiple daily
times

Core loop: Reminder → Taken → Caregiver notified\
If not taken in 30 minutes → Missed → Caregiver alerted

------------------------------------------------------------------------

## 2. User Roles

### Parent

-   Receives alarms
-   Marks doses as Taken
-   Can invite caregivers

### Caregiver

-   Links to parents
-   Adds medicines and schedules
-   Monitors dose status
-   Receives missed-dose alerts

------------------------------------------------------------------------

## 3. Core Collections

### users

-   uid
-   phone
-   role
-   language

### relationships

-   parentId
-   caregiverId
-   active

### medicines

-   medicineId
-   parentId
-   name
-   dosage
-   active

### schedules

-   scheduleId
-   medicineId
-   times\[\]
-   repeat

### doses

-   doseId
-   parentId
-   medicineId
-   scheduledAt
-   status: pending \| taken \| missed
-   takenAt

### inviteCodes

-   code
-   parentId
-   expiresAt
-   used

### deviceTokens

-   userId
-   token
-   active

------------------------------------------------------------------------

## 4. Escalation Logic

Every 5--10 minutes:

If: - dose.status == pending - now \> scheduledAt + 30 minutes

Then: - Update dose.status = missed - Notify all caregivers linked to
parent

------------------------------------------------------------------------

## 5. Non-Functional Requirements

-   Alarm reliability ≥ 99%
-   Escalation latency \< 2 minutes
-   Real-time sync \< 5 seconds
-   Offline Taken supported
-   Android 8+, iOS 14+

------------------------------------------------------------------------

End of FRD
