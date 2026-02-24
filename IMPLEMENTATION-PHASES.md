# PillSathi Implementation Phases

Version: 1.0
Date: 2026-02-16

---

## Phase Overview

The PillSathi project is broken down into 5 phases, each building on the previous one. Each phase is designed to be independently testable and deployable.

---

## Phase 0: Foundation & Firebase Setup

**Duration**: 1-2 weeks
**Goal**: Set up infrastructure and development environment

### Deliverables

- Firebase project configuration (dev + prod)
- React Native project structure
- Basic navigation framework
- Firebase SDK integration
- Development environment setup

### Firebase Tasks

- Create Firebase projects (dev/prod)
- Enable Firebase Authentication (Phone)
- Create Firestore database
- Set up security rules (basic)
- Configure FCM
- Set up Cloud Functions project structure

### App Tasks

- Initialize React Native with TypeScript
- Install and configure Firebase SDK
- Install and configure Notifee
- Set up navigation (React Navigation)
- Create basic app shell
- Configure environment variables

**Exit Criteria**: App runs on both Android and iOS, connects to Firebase

---

## Phase 1: Authentication & User Management

**Duration**: 2-3 weeks
**Goal**: Users can sign up, log in, and select their role

### User Stories

- As a user, I can log in using my phone number and OTP
- As a user, I can select my role (Parent or Caregiver)
- As a user, my role is saved and cannot be changed
- As a user, I can see a welcome screen appropriate to my role

### Deliverables

- Phone OTP login flow
- Role selection screen
- User profile creation
- Device token registration
- Basic home screens for both roles

### Firebase Tasks

- Implement Firestore security rules for users collection
- Create Cloud Function for user profile initialization
- Set up device token management

### App Tasks

- Phone number input screen
- OTP verification screen
- Role selection screen
- User context/state management
- FCM token registration
- Parent home screen (placeholder)
- Caregiver home screen (placeholder)

**Exit Criteria**: Users can sign up, log in, select role, and see role-specific home screen

---

## Phase 2: Pairing & Relationships

**Duration**: 2 weeks
**Goal**: Parents and caregivers can link their accounts

### User Stories

- As a parent, I can generate an invite code
- As a parent, I can share my invite code with caregivers
- As a caregiver, I can enter an invite code to link with a parent
- As a caregiver, I can see all my linked parents
- As a parent, I can see all my linked caregivers
- As either role, I can remove a relationship

### Deliverables

- Invite code generation system
- Code entry and validation
- Relationship management UI
- Multi-parent/multi-caregiver support

### Firebase Tasks

- Implement inviteCodes collection with TTL
- Implement relationships collection
- Security rules for relationships
- Cloud Function for invite code validation
- Cloud Function for relationship creation

### App Tasks

- Parent: Generate invite code screen
- Parent: Display active caregivers list
- Caregiver: Enter invite code screen
- Caregiver: Display linked parents list
- Relationship management screens
- Code sharing functionality (share sheet)

**Exit Criteria**: Parents and caregivers can successfully pair and see each other in their respective lists

---

## Phase 3: Medicine & Schedule Management

**Duration**: 3 weeks
**Goal**: Caregivers can add medicines and schedules for parents

### User Stories

- As a caregiver, I can add a medicine for a linked parent
- As a caregiver, I can set dosage information
- As a caregiver, I can create a schedule with multiple daily times
- As a caregiver, I can set repeat patterns (daily, specific days)
- As a caregiver, I can edit or delete medicines
- As a caregiver, I can activate/deactivate medicines
- As a parent, I can view my medicines and schedules

### Deliverables

- Medicine CRUD operations
- Schedule creation and management
- Medicine list views for both roles
- Schedule visualization

### Firebase Tasks

- Implement medicines collection with security rules
- Implement schedules collection with security rules
- Cloud Function for dose generation from schedules
- Batch dose creation logic

### App Tasks

- Caregiver: Add medicine form
- Caregiver: Schedule configuration UI
- Caregiver: Medicine list with edit/delete
- Parent: View medicines list
- Parent: View upcoming doses
- Time picker components
- Frequency selector components

**Exit Criteria**: Caregivers can create medicines with schedules, and parents can view them

---

## Phase 4: Reminders & Dose Tracking

**Duration**: 3-4 weeks
**Goal**: Parents receive alarms and can mark doses as taken

### User Stories

- As a parent, I receive a full-screen alarm at scheduled times
- As a parent, I can mark a dose as "Taken" from the alarm
- As a parent, I can see my dose history
- As a caregiver, I can see real-time dose status for my parents
- As a caregiver, I receive a notification when a parent takes their medicine

### Deliverables

- Local alarm scheduling with Notifee
- Full-screen alarm UI
- Dose tracking system
- Real-time status updates
- Dose history views

### Firebase Tasks

- Implement doses collection with security rules
- Cloud Function for dose status updates
- Cloud Function for caregiver notifications on dose taken
- Real-time listeners setup

### App Tasks

- Notifee alarm scheduling logic
- Full-screen alarm activity/screen
- "Taken" button with confirmation
- Dose status sync to Firestore
- Parent: Dose history screen
- Caregiver: Real-time dashboard
- Caregiver: Dose status notifications
- Offline support for marking doses taken

**Exit Criteria**: Parents receive alarms, can mark doses taken, and caregivers see updates in real-time

---

## Phase 5: Escalation & Monitoring

**Duration**: 2-3 weeks
**Goal**: Missed doses are detected and caregivers are alerted

### User Stories

- As a caregiver, I receive an alert when a parent misses a dose (30 min overdue)
- As a caregiver, I can see which doses were missed
- As a caregiver, I can view adherence statistics
- As a parent, I can see which doses I missed
- As a caregiver, I can configure escalation settings (future)

### Deliverables

- Missed dose detection system
- Escalation notifications to caregivers
- Adherence dashboard
- Statistics and reporting

### Firebase Tasks

- Cloud Function: scheduledDoseCheck (cron every 5 min)
- Missed dose detection logic
- FCM push notification to all caregivers
- Adherence calculation functions

### App Tasks

- Caregiver: Missed dose alert notifications
- Caregiver: Adherence dashboard
- Caregiver: Statistics view
- Parent: Missed doses view
- Push notification handling
- Notification permission management

**Exit Criteria**: Missed doses are automatically detected and all linked caregivers receive alerts

---

## Phase 6: Polish & Production Readiness (Optional)

**Duration**: 2-3 weeks
**Goal**: Production-ready app with enhanced UX

### Deliverables

- Onboarding flow
- Help/tutorial screens
- Settings and preferences
- Language support
- Error handling and retry logic
- Analytics integration
- Performance optimization
- App store assets

### Tasks

- Onboarding screens
- In-app help
- Settings screens
- Multi-language support
- Comprehensive error handling
- Analytics events
- Performance profiling
- App store listings
- Beta testing

**Exit Criteria**: App is ready for production release

---

## Total Timeline

- Phase 0: 1-2 weeks
- Phase 1: 2-3 weeks
- Phase 2: 2 weeks
- Phase 3: 3 weeks
- Phase 4: 3-4 weeks
- Phase 5: 2-3 weeks
- Phase 6: 2-3 weeks (optional)

**Total: 15-20 weeks (4-5 months) for core MVP**

---

## Dependencies

- Phase 1 depends on Phase 0
- Phase 2 depends on Phase 1
- Phase 3 depends on Phase 2
- Phase 4 depends on Phase 3
- Phase 5 depends on Phase 4
- Phase 6 depends on Phase 5

Each phase should be fully tested before moving to the next.
