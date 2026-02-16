# PillSathi Project Roadmap

Version: 1.0
Date: 2026-02-16

---

## Quick Reference

This document provides a high-level overview of the PillSathi project structure and implementation plan.

---

## Document Structure

### Core Documents

1. **PillSathi-PRD.md** - Product Requirements Document

   - Executive summary
   - Problem statement
   - Goals and success metrics
   - Technology stack

2. **PillSathi-FRD.md** - Functional Requirements Document

   - User roles
   - Core collections
   - Escalation logic
   - Non-functional requirements

3. **PillSathi-TAD.md** - Technical Architecture Document
   - System overview
   - Data flows
   - Cloud Functions
   - Security model

### Implementation Documents

4. **IMPLEMENTATION-PHASES.md** - Phase breakdown

   - 6 phases from foundation to production
   - Timeline: 15-20 weeks
   - Dependencies and deliverables

5. **FIREBASE-SETUP-GUIDE.md** - Complete Firebase setup

   - Project configuration
   - Security rules
   - Cloud Functions code
   - Monitoring and alerts

6. **PROJECT-ROADMAP.md** - This document
   - Quick reference
   - Getting started guide

### Spec Documents

7. **.kiro/specs/phase-0-foundation/** - Phase 0 spec
   - Detailed requirements
   - Acceptance criteria
   - Testing requirements

---

## Implementation Phases Summary

### Phase 0: Foundation (1-2 weeks)

**Goal**: Infrastructure setup

- Firebase projects (dev/prod)
- React Native with TypeScript
- Basic navigation
- Development environment

**Key Deliverable**: App runs on both platforms, connects to Firebase

---

### Phase 1: Authentication (2-3 weeks)

**Goal**: User login and role selection

- Phone OTP authentication
- Role selection (Parent/Caregiver)
- User profile creation
- Device token registration

**Key Deliverable**: Users can sign up, log in, and see role-specific home screen

---

### Phase 2: Pairing (2 weeks)

**Goal**: Link parents and caregivers

- Invite code generation
- Code entry and validation
- Relationship management
- Multi-parent/multi-caregiver support

**Key Deliverable**: Parents and caregivers can successfully pair

---

### Phase 3: Medicine Management (3 weeks)

**Goal**: Medicine and schedule setup

- Medicine CRUD operations
- Schedule creation (multiple daily times)
- Repeat patterns
- Medicine list views

**Key Deliverable**: Caregivers can create medicines with schedules

---

### Phase 4: Reminders (3-4 weeks)

**Goal**: Alarms and dose tracking

- Local alarm scheduling (Notifee)
- Full-screen alarm UI
- "Taken" button
- Real-time status updates
- Dose history

**Key Deliverable**: Parents receive alarms and can mark doses taken

---

### Phase 5: Escalation (2-3 weeks)

**Goal**: Missed dose detection and alerts

- Scheduled dose checking (Cloud Function)
- Missed dose detection (30 min overdue)
- Caregiver notifications
- Adherence dashboard

**Key Deliverable**: Missed doses trigger alerts to all caregivers

---

### Phase 6: Polish (2-3 weeks) - Optional

**Goal**: Production readiness

- Onboarding flow
- Help screens
- Settings
- Multi-language support
- Analytics
- Performance optimization

**Key Deliverable**: Production-ready app

---

## Firebase Components

### Collections

- `users` - User profiles and roles
- `relationships` - Parent-caregiver links
- `medicines` - Medicine information
- `schedules` - Dosing schedules
- `doses` - Individual dose instances
- `inviteCodes` - Pairing codes
- `deviceTokens` - FCM tokens

### Cloud Functions

- `scheduledDoseCheck` - Runs every 5 minutes to detect missed doses
- `onUserCreated` - Initialize user profile on signup
- `sendMissedDoseNotification` - Alert caregivers

### Services Used

- Firebase Authentication (Phone)
- Firestore (database)
- Cloud Functions (backend logic)
- Firebase Cloud Messaging (push notifications)
- Notifee (local alarms)

---

## Getting Started

### For Developers

1. **Read the core documents**

   - Start with PRD to understand the product
   - Review FRD for functional requirements
   - Study TAD for technical architecture

2. **Set up Firebase**

   - Follow FIREBASE-SETUP-GUIDE.md
   - Create dev and prod projects
   - Configure authentication and Firestore

3. **Start with Phase 0**

   - Review .kiro/specs/phase-0-foundation/requirements.md
   - Initialize React Native project
   - Integrate Firebase SDK
   - Set up navigation

4. **Progress through phases**
   - Complete each phase before moving to next
   - Test thoroughly at each phase
   - Update documentation as needed

### For Project Managers

1. **Review IMPLEMENTATION-PHASES.md**

   - Understand timeline (15-20 weeks)
   - Note dependencies between phases
   - Plan resources accordingly

2. **Track success metrics** (from PRD)

   - ≥70% doses marked Taken
   - <25% doses escalate
   - ≥60% weekly active parents
   - ≥80% pairing completion

3. **Monitor phase completion**
   - Each phase has clear exit criteria
   - Ensure testing before phase transition
   - Document any deviations

---

## Key Technical Decisions

### Why React Native?

- Single codebase for Android and iOS
- Good performance for this use case
- Strong ecosystem for Firebase integration
- Team expertise

### Why Firebase?

- Rapid development
- Real-time sync
- Built-in authentication
- Scalable infrastructure
- Cost-effective for MVP

### Why Notifee for alarms?

- Reliable local notifications
- Full-screen alarm support
- Works offline
- Better than FCM for scheduled alarms

### Why Cloud Functions for escalation?

- Reliable scheduled execution
- Centralized logic
- No client-side battery drain
- Easier to maintain

---

## Critical Success Factors

1. **Alarm Reliability**

   - Must work even when app is closed
   - Must survive device restarts
   - Must handle timezone changes

2. **Real-time Sync**

   - Caregivers see updates immediately
   - Offline support for parents
   - Conflict resolution

3. **Escalation Accuracy**

   - No false positives
   - Timely notifications (< 2 min latency)
   - All caregivers notified

4. **User Experience**
   - Simple for elderly users
   - Clear status indicators
   - Minimal steps to mark "Taken"

---

## Risk Management

### High Priority Risks

1. **Alarm reliability on Android**

   - **Risk**: Battery optimization kills alarms
   - **Mitigation**: Use Notifee, request battery optimization exemption

2. **Notification delivery**

   - **Risk**: FCM messages not delivered
   - **Mitigation**: Retry logic, fallback mechanisms

3. **Timezone handling**

   - **Risk**: Incorrect dose times across timezones
   - **Mitigation**: Store all times in UTC, convert for display

4. **Offline sync conflicts**
   - **Risk**: Multiple caregivers editing same medicine
   - **Mitigation**: Firestore conflict resolution, last-write-wins

---

## Testing Strategy

### Phase 0-1: Foundation

- Manual testing on real devices
- Basic smoke tests

### Phase 2-3: Core Features

- Unit tests for business logic
- Integration tests for Firebase
- Manual testing of user flows

### Phase 4-5: Critical Features

- Alarm reliability testing (24-48 hours)
- Escalation accuracy testing
- Load testing (multiple users)
- Offline scenario testing

### Phase 6: Production

- Beta testing with real users
- Performance profiling
- Security audit
- Accessibility testing

---

## Deployment Strategy

### Development

- Continuous deployment to dev Firebase
- TestFlight (iOS) and Internal Testing (Android)
- Weekly builds

### Staging

- Manual deployment to prod Firebase
- Closed beta testing
- Bi-weekly builds

### Production

- Phased rollout (10% → 50% → 100%)
- Monitor crash rates and metrics
- Rollback plan ready

---

## Support & Maintenance

### Monitoring

- Firebase Crashlytics for crash reports
- Firebase Performance for app performance
- Cloud Function logs for backend issues
- Custom analytics for user behavior

### Alerts

- High crash rate
- Cloud Function failures
- High Firebase costs
- Low dose completion rate

### Maintenance Windows

- Cloud Function updates: Any time (zero downtime)
- Security rule updates: Low-traffic hours
- Database migrations: Scheduled maintenance

---

## Team Roles

### Mobile Developer

- React Native development
- Platform-specific features
- UI/UX implementation
- Testing

### Backend Developer

- Cloud Functions
- Firestore security rules
- Data modeling
- API design

### DevOps

- Firebase configuration
- CI/CD pipeline
- Monitoring and alerts
- Deployment

### QA

- Test planning
- Manual testing
- Automated testing
- Bug tracking

### Product Manager

- Requirements gathering
- Priority decisions
- User feedback
- Metrics tracking

---

## Resources

### Documentation

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Firebase Docs](https://firebase.google.com/docs)
- [Notifee Docs](https://notifee.app/react-native/docs/overview)
- [React Navigation Docs](https://reactnavigation.org/docs/getting-started)

### Tools

- [Firebase Console](https://console.firebase.google.com/)
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/)

### Community

- React Native Discord
- Firebase Stack Overflow
- GitHub Issues

---

## Next Steps

1. **Immediate** (This Week)

   - Review all documentation
   - Set up Firebase projects
   - Initialize React Native project
   - Start Phase 0 implementation

2. **Short Term** (Next 2 Weeks)

   - Complete Phase 0
   - Begin Phase 1 (Authentication)
   - Set up CI/CD pipeline

3. **Medium Term** (Next 2 Months)

   - Complete Phases 1-3
   - Begin beta testing
   - Gather user feedback

4. **Long Term** (3-5 Months)
   - Complete Phases 4-5
   - Production launch
   - Monitor and iterate

---

## Questions?

For questions or clarifications:

1. Review the relevant document (PRD, FRD, TAD)
2. Check FIREBASE-SETUP-GUIDE.md for Firebase issues
3. Review IMPLEMENTATION-PHASES.md for timeline questions
4. Consult phase-specific requirements in .kiro/specs/

---

End of Project Roadmap
