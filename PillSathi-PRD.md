# PillSathi --- Product Requirements Document (PRD)

Version: 1.0\
Phase: v0+\
Date: 2026-02-16

------------------------------------------------------------------------

## 1. Executive Summary

PillSathi helps elderly parents take medicines on time while giving
caregivers real-time visibility.

Parent confirms dose → Caregiver gains peace of mind.

------------------------------------------------------------------------

## 2. Problem

-   Elderly users forget medication
-   Notifications are ignored
-   Children lack adherence visibility
-   No escalation mechanism

------------------------------------------------------------------------

## 3. Goals (v0+)

-   Reliable alarms
-   Simple Taken confirmation
-   Multi-parent / multi-caregiver support
-   Missed-dose escalation

------------------------------------------------------------------------

## 4. In Scope

-   Phone OTP login
-   Role selection
-   Invite code pairing
-   Multiple parents & caregivers
-   Multiple medicines per parent
-   Frequency with multiple daily times
-   Full-screen alarms
-   Taken button
-   Missed escalation
-   Real-time dashboards

------------------------------------------------------------------------

## 5. Success Metrics

-   ≥70% doses marked Taken
-   \<25% doses escalate
-   ≥60% weekly active parents
-   ≥80% pairing completion

------------------------------------------------------------------------

## 6. Technology Stack

Frontend: - React Native (TypeScript)

Backend: - Firebase Auth - Firestore - Cloud Functions - Firebase Cloud
Messaging

Notifications: - Notifee (local alarms) - FCM (remote push)

------------------------------------------------------------------------

## 7. Product Principle

Build for behavior, not features.

------------------------------------------------------------------------

End of PRD
