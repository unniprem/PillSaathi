# Implementation Plan: Pairing & Relationships System

## Overview

This implementation plan breaks down the Pairing & Relationships system into discrete coding tasks. The system enables parents to generate time-limited invite codes that caregivers can redeem to establish secure relationships. The implementation follows a bottom-up approach: data models and services first, then Cloud Functions, then UI components, and finally integration.

The plan builds incrementally, with each task producing working, testable code. Property-based tests are included as optional sub-tasks to validate universal correctness properties, while unit tests verify specific examples and edge cases.

## Tasks

- [ ] 1. Set up Firestore collections and security rules

  - Create Firestore collections: `inviteCodes` and `relationships`
  - Define composite indexes for efficient queries
  - Implement security rules for invite codes (read: only parent, create: only parent, no updates/deletes)
  - Implement security rules for relationships (read: only participants, no direct creates, delete: only participants)
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 2. Implement InviteCodeService

  - [ ] 2.1 Create InviteCodeService class with code generation logic

    - Implement `generateRandomCode(length)` to create 8-character alphanumeric codes
    - Implement `calculateExpiration(hours)` to compute expiration timestamp (24 hours)
    - Implement `isCodeExpired(expiresAt)` to check if code has expired
    - _Requirements: 1.1, 1.3, 8.3_

  - [ ]\* 2.2 Write property test for code generation completeness

    - **Property 1: Invite Code Generation Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ] 2.3 Implement `generateInviteCode(parentUid)` method

    - Query Firestore for active unexpired codes for the parent
    - If active code exists, return it (idempotence)
    - If no active code, generate new code and store in Firestore with all required fields
    - _Requirements: 1.1, 1.2, 1.5_

  - [ ]\* 2.4 Write property test for code generation idempotence

    - **Property 2: Invite Code Generation Idempotence**
    - **Validates: Requirements 1.5**

  - [ ] 2.5 Implement `getActiveInviteCode(parentUid)` method

    - Query Firestore for active unexpired codes
    - Return code object or null
    - _Requirements: 2.3_

  - [ ]\* 2.6 Write property test for expiration time calculation

    - **Property 3: Expiration Time Calculation**
    - **Validates: Requirements 2.3, 3.3, 8.1, 8.3**

  - [ ]\* 2.7 Write unit tests for InviteCodeService
    - Test code format (8 characters, alphanumeric, uppercase)
    - Test TTL calculation (exactly 24 hours)
    - Test Firestore storage with correct fields
    - Test error handling for Firestore failures
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 3. Implement Cloud Function: redeemInviteCode

  - [ ] 3.1 Create redeemInviteCode callable function

    - Validate authentication (reject if not authenticated)
    - Validate input parameters (code, caregiverUid)
    - Validate requesting user matches caregiverUid
    - _Requirements: 7.5_

  - [ ] 3.2 Implement invite code validation logic

    - Validate code format (8 characters, alphanumeric)
    - Query Firestore for code
    - Check if code exists and is not expired
    - Return appropriate errors for invalid/expired codes
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]\* 3.3 Write property test for code format validation

    - **Property 4: Invite Code Format Validation**
    - **Validates: Requirements 3.1**

  - [ ] 3.4 Implement relationship creation logic

    - Check for existing relationship (idempotence)
    - If exists, return success without creating duplicate
    - If not exists, create relationship document with parentUid, caregiverUid, createdAt
    - _Requirements: 3.5, 3.6, 3.7_

  - [ ]\* 3.5 Write property test for relationship creation

    - **Property 5: Relationship Creation from Valid Code**
    - **Validates: Requirements 3.5, 3.6**

  - [ ]\* 3.6 Write property test for relationship creation idempotence

    - **Property 6: Relationship Creation Idempotence**
    - **Validates: Requirements 3.7**

  - [ ]\* 3.7 Write unit tests for redeemInviteCode function
    - Test successful redemption flow
    - Test expired code rejection
    - Test invalid code rejection
    - Test non-existent code rejection
    - Test duplicate relationship handling
    - Test authentication requirement
    - Test authorization (caregiver can only redeem for themselves)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 7.5_

- [ ] 4. Checkpoint - Ensure invite code generation and redemption work

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement RelationshipService

  - [ ] 5.1 Create RelationshipService class with query methods

    - Implement `getRelationships(uid, role)` to query relationships by user and role
    - Query by `parentUid` for parents, `caregiverUid` for caregivers
    - Fetch and attach user profile data (name, phone) for display
    - _Requirements: 4.1, 5.1_

  - [ ]\* 5.2 Write property test for relationship query correctness

    - **Property 7: Relationship Query Correctness**
    - **Validates: Requirements 4.1, 5.1**

  - [ ] 5.3 Implement `subscribeToRelationships(uid, role, callback)` method

    - Set up Firestore real-time listener for relationships
    - Call callback with updated relationships array on changes
    - Return unsubscribe function
    - _Requirements: 4.3, 5.3_

  - [ ] 5.4 Implement `getUserProfile(uid)` helper method

    - Query users collection for profile data
    - Return name and phone for relationship display
    - _Requirements: 4.2, 5.2_

  - [ ]\* 5.5 Write unit tests for RelationshipService
    - Test query returns correct relationships for parent
    - Test query returns correct relationships for caregiver
    - Test query excludes relationships user is not part of
    - Test real-time listener setup and updates
    - Test profile data fetching
    - _Requirements: 4.1, 4.2, 5.1, 5.2_

- [ ] 6. Implement Cloud Function: removeRelationship

  - [ ] 6.1 Create removeRelationship callable function

    - Validate authentication
    - Validate input (relationshipId)
    - Fetch relationship document
    - Verify requesting user is parent or caregiver in the relationship
    - Delete relationship document
    - _Requirements: 6.2, 7.4_

  - [ ]\* 6.2 Write property test for relationship removal authorization

    - **Property 8: Relationship Removal Authorization**
    - **Validates: Requirements 6.2**

  - [ ]\* 6.3 Write unit tests for removeRelationship function
    - Test parent can remove relationship
    - Test caregiver can remove relationship
    - Test unauthorized user cannot remove relationship
    - Test removal of non-existent relationship
    - Test authentication requirement
    - _Requirements: 6.2, 7.4, 7.5_

- [ ] 7. Implement Cloud Function: cleanupExpiredInviteCodes (scheduled)

  - Create scheduled function to run every hour
  - Query invite codes older than 48 hours
  - Delete expired codes in batch
  - Log cleanup results
  - _Requirements: 8.2_

- [ ] 8. Implement PairingContext

  - [ ] 8.1 Create PairingContext with state management

    - Define context state: inviteCode, relationships, loading, error
    - Implement context provider component
    - Create custom hook `usePairing()` for consuming context
    - _Requirements: 1.1, 4.1, 5.1_

  - [ ] 8.2 Implement context methods

    - Implement `generateInviteCode()` using InviteCodeService
    - Implement `redeemInviteCode(code)` calling Cloud Function
    - Implement `removeRelationship(relationshipId)` calling Cloud Function
    - Implement `refreshRelationships()` to manually refresh data
    - Add error handling and loading state management
    - _Requirements: 1.1, 3.5, 6.2, 9.1_

  - [ ] 8.3 Set up real-time listeners in context

    - Subscribe to relationships on context mount
    - Update context state when relationships change
    - Clean up listeners on unmount
    - _Requirements: 4.3, 5.3, 6.3_

  - [ ]\* 8.4 Write unit tests for PairingContext
    - Test context initialization
    - Test generateInviteCode updates state
    - Test redeemInviteCode updates state
    - Test removeRelationship updates state
    - Test real-time listener updates
    - Test error handling
    - _Requirements: 1.1, 3.5, 4.3, 5.3, 6.2_

- [ ] 9. Checkpoint - Ensure services and context work correctly

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement UI Components: Invite Code Display

  - [ ] 10.1 Create InviteCodeDisplay component

    - Display invite code in large, readable format
    - Show expiration countdown timer
    - Implement copy to clipboard button
    - Implement share button using React Native Share API
    - Handle expired code state (show message and regenerate button)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]\* 10.2 Write unit tests for InviteCodeDisplay
    - Test code display formatting
    - Test expiration countdown calculation
    - Test copy to clipboard functionality
    - Test share button functionality
    - Test expired code UI
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 11. Implement UI Components: Relationship Card

  - [ ] 11.1 Create RelationshipCard component

    - Display user name and phone number
    - Display relationship creation date
    - Implement remove button with confirmation dialog
    - Handle loading state during removal
    - _Requirements: 4.2, 5.2, 6.1_

  - [ ]\* 11.2 Write unit tests for RelationshipCard
    - Test user information display
    - Test remove button shows confirmation
    - Test confirmation dialog actions
    - Test loading state during removal
    - _Requirements: 4.2, 5.2, 6.1_

- [ ] 12. Implement ParentPairingScreen

  - [ ] 12.1 Create ParentPairingScreen component

    - Display active invite code or generate button
    - Show InviteCodeDisplay when code exists
    - Show generate button when no active code
    - Display list of linked caregivers using RelationshipCard
    - Handle empty state (no caregivers)
    - Handle loading states
    - Handle error states with retry option
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 5.1, 5.2, 5.4, 9.2, 9.3, 9.4_

  - [ ]\* 12.2 Write unit tests for ParentPairingScreen
    - Test generate button appears when no code
    - Test code display appears when code exists
    - Test caregiver list rendering
    - Test empty state display
    - Test loading state display
    - Test error state display
    - _Requirements: 1.1, 2.1, 5.1, 5.4, 9.2, 9.3, 9.4_

- [ ] 13. Implement CaregiverPairingScreen

  - [ ] 13.1 Create CaregiverPairingScreen component

    - Create input field for invite code entry
    - Implement code format validation (8 characters, alphanumeric)
    - Create redeem button with loading state
    - Display list of linked parents using RelationshipCard
    - Handle empty state (no parents)
    - Handle loading states
    - Handle error states with specific error messages
    - _Requirements: 3.1, 4.1, 4.2, 4.4, 9.1, 9.2, 9.3, 9.4_

  - [ ]\* 13.2 Write unit tests for CaregiverPairingScreen
    - Test code input validation
    - Test redeem button disabled during loading
    - Test parent list rendering
    - Test empty state display
    - Test error message display for different error types
    - Test loading state display
    - _Requirements: 3.1, 4.1, 4.4, 9.1, 9.2, 9.3, 9.4_

- [ ] 14. Implement error handling and user feedback

  - [ ] 14.1 Create error message mapping

    - Define ERROR_MESSAGES object with all error codes
    - Map Firebase errors to user-friendly messages
    - Map Cloud Function errors to user-friendly messages
    - _Requirements: 9.1_

  - [ ]\* 14.2 Write property test for error message specificity

    - **Property 14: Error Message Specificity**
    - **Validates: Requirements 9.1**

  - [ ] 14.3 Implement retry logic for network errors

    - Create retry helper with exponential backoff
    - Identify retryable errors (network, timeout, unavailable)
    - Integrate retry logic into service methods
    - _Requirements: 9.2_

  - [ ] 14.4 Implement optimistic UI updates

    - Update UI immediately for relationship removal
    - Rollback on error
    - Show success confirmation on success
    - _Requirements: 6.3, 9.3_

  - [ ]\* 14.5 Write unit tests for error handling
    - Test error message mapping for all error codes
    - Test retry logic with exponential backoff
    - Test optimistic UI updates and rollback
    - _Requirements: 9.1, 9.2_

- [ ] 15. Implement security rules property tests

  - [ ]\* 15.1 Write property test for invite code read access control

    - **Property 9: Invite Code Read Access Control**
    - **Validates: Requirements 7.1**

  - [ ]\* 15.2 Write property test for relationship read access control

    - **Property 10: Relationship Read Access Control**
    - **Validates: Requirements 7.2**

  - [ ]\* 15.3 Write property test for relationship direct creation prevention

    - **Property 11: Relationship Direct Creation Prevention**
    - **Validates: Requirements 7.3**

  - [ ]\* 15.4 Write property test for relationship deletion access control

    - **Property 12: Relationship Deletion Access Control**
    - **Validates: Requirements 7.4**

  - [ ]\* 15.5 Write property test for Cloud Function authentication requirement
    - **Property 13: Cloud Function Authentication Requirement**
    - **Validates: Requirements 7.5**

- [ ] 16. Integration and navigation wiring

  - [ ] 16.1 Add pairing screens to navigation

    - Add ParentPairingScreen to ParentNavigator
    - Add CaregiverPairingScreen to CaregiverNavigator
    - Configure navigation options (titles, headers)
    - _Requirements: 1.1, 3.1_

  - [ ] 16.2 Wrap app with PairingContext provider

    - Add PairingProvider to app component tree
    - Ensure it's below AuthProvider (depends on auth state)
    - _Requirements: 1.1, 4.1, 5.1_

  - [ ]\* 16.3 Write integration tests
    - Test complete pairing flow (parent generates, caregiver redeems)
    - Test multi-caregiver scenario (one parent, multiple caregivers)
    - Test multi-parent scenario (one caregiver, multiple parents)
    - Test relationship removal flow (updates both users)
    - Test expired code handling
    - Test duplicate relationship prevention
    - _Requirements: 1.1, 1.5, 3.5, 3.7, 6.2_

- [ ] 17. Final checkpoint - Ensure all tests pass and feature is complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate end-to-end flows across multiple components
- The implementation follows a bottom-up approach: services → Cloud Functions → context → UI
- Real-time listeners provide instant updates when relationships change
- Security rules are enforced at the database level for defense in depth
