# Implementation Plan: Authentication & User Management System

## Overview

This implementation plan breaks down the authentication system into discrete, incremental steps. Each task builds on previous work, with testing integrated throughout to catch errors early. The plan follows the architecture defined in the design document and ensures all requirements are met.

## Tasks

- [x] 1. Set up authentication infrastructure and services

  - Create directory structure: `src/services/auth/`, `src/contexts/`, `src/screens/auth/`
  - Install and configure fast-check for property-based testing
  - Set up Firebase Auth and Firestore mocks for testing
  - Create error message mapping constants
  - _Requirements: 1.4, 6.2_

- [x] 2. Implement AuthService for Firebase Authentication

  - [x] 2.1 Create AuthService class with phone OTP methods

    - Implement `sendPhoneOTP(phoneNumber)` method
    - Implement `verifyPhoneOTP(verificationId, code)` method
    - Implement `signOut()` method
    - Implement `getCurrentUser()` method
    - Implement `getErrorMessage(errorCode)` for error mapping
    - Add JSDoc documentation for all methods
    - _Requirements: 1.1, 1.4, 1.5, 1.6_

  - [ ]\* 2.2 Write property test for valid phone number OTP sending

    - **Property 1: Valid Phone Number OTP Sending**
    - **Validates: Requirements 1.1**

  - [ ]\* 2.3 Write property test for invalid phone number rejection

    - **Property 2: Invalid Phone Number Rejection**
    - **Validates: Requirements 1.2**

  - [ ]\* 2.4 Write property test for Firebase error code mapping

    - **Property 3: Firebase Error Code Mapping**
    - **Validates: Requirements 1.4, 6.2**

  - [ ]\* 2.5 Write unit tests for AuthService
    - Test successful OTP sending
    - Test OTP verification success and failure
    - Test sign out functionality
    - Test network error handling
    - _Requirements: 1.1, 1.5, 1.6, 6.1_

- [x] 3. Implement ProfileService for Firestore operations

  - [x] 3.1 Create ProfileService class with CRUD methods

    - Implement `createProfile(uid, profileData)` method
    - Implement `getProfile(uid)` method
    - Implement `updateProfile(uid, updates)` method
    - Implement `validateProfileData(profileData)` method
    - Implement `profileExists(uid)` method
    - Add JSDoc documentation for all methods
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_

  - [ ]\* 3.2 Write property test for profile document ID invariant

    - **Property 7: Profile Document ID Invariant**
    - **Validates: Requirements 3.2**

  - [ ]\* 3.3 Write property test for profile required fields completeness

    - **Property 8: Profile Required Fields Completeness**
    - **Validates: Requirements 3.3**

  - [ ]\* 3.4 Write property test for profile validation enforcement

    - **Property 11: Profile Validation Enforcement**
    - **Validates: Requirements 3.7**

  - [ ]\* 3.5 Write unit tests for ProfileService
    - Test profile creation with valid data
    - Test profile retrieval (existing and non-existing)
    - Test profile update operations
    - Test validation errors for missing fields
    - Test Firestore error handling
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 3.7_

- [ ] 4. Checkpoint - Ensure service layer tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement AuthContext and state management

  - [x] 5.1 Create AuthContext with provider component

    - Define auth state shape (user, profile, loading, initialized, error)
    - Implement AuthProvider component with state management
    - Implement `sendOTP(phoneNumber)` context method
    - Implement `verifyOTP(verificationId, code)` context method
    - Implement `resendOTP(phoneNumber)` context method
    - Implement `createProfile(uid, profileData)` context method
    - Implement `updateProfile(uid, updates)` context method
    - Implement `signOut()` context method
    - Set up Firebase auth state listener in useEffect
    - Implement auth state persistence using AsyncStorage
    - Add JSDoc documentation
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7_

  - [ ]\* 5.2 Write property test for authentication state persistence

    - **Property 12: Authentication State Persistence**
    - **Validates: Requirements 4.1**

  - [ ]\* 5.3 Write property test for auth context state propagation

    - **Property 14: Auth Context State Propagation**
    - **Validates: Requirements 4.6**

  - [ ]\* 5.4 Write property test for auth state change notification

    - **Property 15: Auth State Change Notification**
    - **Validates: Requirements 4.7**

  - [ ]\* 5.5 Write unit tests for AuthContext
    - Test context initialization
    - Test sendOTP flow
    - Test verifyOTP flow
    - Test resendOTP flow
    - Test signOut flow
    - Test state persistence and restoration
    - Test error handling
    - _Requirements: 1.7, 4.1, 4.2, 4.3, 4.4_

- [x] 6. Implement PhoneAuthScreen UI component

  - [x] 6.1 Create PhoneAuthScreen with phone input and validation

    - Create screen component with phone number input
    - Add country code picker (default to user's country)
    - Implement phone number formatting as user types
    - Implement client-side validation for phone format
    - Add "Send OTP" button with loading state
    - Display error messages below input
    - Implement navigation to OTP screen on success
    - Add accessibility labels and touch targets
    - _Requirements: 1.1, 1.2, 1.3, 7.1, 8.1, 8.4_

  - [ ]\* 6.2 Write unit tests for PhoneAuthScreen
    - Test phone number input and formatting
    - Test validation error display
    - Test send OTP button behavior
    - Test loading state display
    - Test navigation on success
    - Test accessibility attributes
    - _Requirements: 1.1, 1.2, 1.3, 7.1, 8.1_

- [x] 7. Implement OTPVerificationScreen UI component

  - [x] 7.1 Create OTPVerificationScreen with OTP input

    - Create screen component with 6-digit OTP input
    - Implement auto-focus and auto-advance between digits
    - Add "Verify" button with loading state
    - Add "Resend OTP" button with countdown timer (60 seconds)
    - Display error messages
    - Implement navigation on successful verification
    - Handle OTP timeout scenarios
    - Add accessibility labels and touch targets
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 7.2, 8.1, 8.4_

  - [ ]\* 7.2 Write property test for invalid OTP error handling

    - **Property 4: Invalid OTP Error Handling**
    - **Validates: Requirements 1.6**

  - [ ]\* 7.3 Write unit tests for OTPVerificationScreen
    - Test OTP input behavior
    - Test verify button functionality
    - Test resend OTP with countdown
    - Test error message display
    - Test loading states
    - Test navigation on success
    - Test accessibility attributes
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 7.2_

- [x] 8. Implement RoleSelectionScreen UI component

  - [x] 8.1 Create RoleSelectionScreen with role options

    - Create screen component with two role cards (Parent, Caregiver)
    - Add role descriptions and icons
    - Implement role selection handling
    - Add loading state during profile creation
    - Display error messages if profile creation fails
    - Implement navigation to profile setup or main app
    - Add accessibility labels and touch targets
    - _Requirements: 2.1, 2.2, 2.4, 7.3, 8.1, 8.4_

  - [ ]\* 8.2 Write property test for role storage persistence

    - **Property 5: Role Storage Persistence**
    - **Validates: Requirements 2.2**

  - [ ]\* 8.3 Write unit tests for RoleSelectionScreen
    - Test role card rendering
    - Test role selection handling
    - Test profile creation on selection
    - Test error handling and retry
    - Test loading state display
    - Test accessibility attributes
    - _Requirements: 2.1, 2.2, 2.4, 7.3_

- [x] 9. Implement ProfileSetupScreen UI component

  - [x] 9.1 Create ProfileSetupScreen for name input

    - Create screen component with name input field
    - Implement name validation (non-empty, reasonable length)
    - Add "Save" button with loading state
    - Display error messages
    - Implement profile update and navigation to main app
    - Add accessibility labels and touch targets
    - _Requirements: 3.4, 7.3, 8.1, 8.4_

  - [ ]\* 9.2 Write property test for profile update persistence

    - **Property 9: Profile Update Persistence**
    - **Validates: Requirements 3.4**

  - [ ]\* 9.3 Write unit tests for ProfileSetupScreen
    - Test name input and validation
    - Test save button functionality
    - Test profile update operation
    - Test error handling
    - Test loading state display
    - Test accessibility attributes
    - _Requirements: 3.4, 7.3_

- [ ] 10. Checkpoint - Ensure UI component tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement navigation and route protection

  - [x] 11.1 Create root navigation with auth state routing

    - Update App.js to wrap with AuthProvider
    - Implement conditional navigation based on auth state
    - Route unauthenticated users to AuthNavigator
    - Route authenticated Parent users to ParentNavigator
    - Route authenticated Caregiver users to CaregiverNavigator
    - Add splash/loading screen during auth state initialization
    - _Requirements: 2.3, 2.5, 2.6, 4.2, 4.3, 5.1, 5.2, 5.3, 7.4_

  - [ ]\* 11.2 Write property test for role-based navigation access

    - **Property 6: Role-Based Navigation Access**
    - **Validates: Requirements 2.5, 2.6, 5.2, 5.3**

  - [ ]\* 11.3 Write property test for unauthenticated access control

    - **Property 16: Unauthenticated Access Control**
    - **Validates: Requirements 5.1**

  - [ ]\* 11.4 Write property test for unauthorized access redirection

    - **Property 17: Unauthorized Access Redirection**
    - **Validates: Requirements 5.4**

  - [ ]\* 11.5 Write unit tests for navigation logic
    - Test unauthenticated routing to AuthNavigator
    - Test parent role routing to ParentNavigator
    - Test caregiver role routing to CaregiverNavigator
    - Test returning user auto-login flow
    - Test splash screen display during initialization
    - _Requirements: 2.3, 5.1, 5.2, 5.3, 5.4, 7.4_

- [x] 12. Implement logout functionality

  - [x] 12.1 Add logout functionality to user screens

    - Add logout button to parent and caregiver screens
    - Implement logout confirmation dialog
    - Call AuthContext signOut method
    - Verify navigation to login screen after logout
    - Verify auth state is cleared
    - _Requirements: 4.4, 5.5_

  - [ ]\* 12.2 Write property test for auth-to-unauth navigation transition

    - **Property 18: Auth-to-Unauth Navigation Transition**
    - **Validates: Requirements 5.5**

  - [ ]\* 12.3 Write unit tests for logout functionality
    - Test logout button behavior
    - Test confirmation dialog
    - Test auth state clearing
    - Test navigation to login screen
    - _Requirements: 4.4, 5.5_

- [-] 13. Implement error logging and monitoring

  - [-] 13.1 Add error logging throughout auth system

    - Implement error logging utility function
    - Add error logging to AuthService methods
    - Add error logging to ProfileService methods
    - Add error logging to AuthContext methods
    - Include context information (timestamp, user ID, operation)
    - _Requirements: 6.6_

  - [ ]\* 13.2 Write property test for authentication error logging

    - **Property 19: Authentication Error Logging**
    - **Validates: Requirements 6.6**

  - [ ]\* 13.3 Write unit tests for error logging
    - Test error logging on auth failures
    - Test error logging on profile failures
    - Test log entry format and content
    - _Requirements: 6.6_

- [~] 14. Implement loading states and UI polish

  - [ ] 14.1 Add comprehensive loading states

    - Ensure all async operations show loading indicators
    - Disable buttons during loading states
    - Add loading overlay for profile operations
    - Implement smooth transitions between states
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

  - [ ]\* 14.2 Write property test for loading state UI disabling

    - **Property 20: Loading State UI Disabling**
    - **Validates: Requirements 7.6**

  - [ ]\* 14.3 Write unit tests for loading states
    - Test loading indicator display during operations
    - Test button disabling during loading
    - Test loading state cleanup after completion
    - _Requirements: 7.1, 7.2, 7.3, 7.6_

- [~] 15. Implement accessibility features

  - [ ] 15.1 Add accessibility attributes to all components

    - Add accessibilityLabel to all input fields
    - Add accessibilityHint where helpful
    - Add accessibilityRole to buttons and inputs
    - Ensure error messages are announced to screen readers
    - Verify touch target sizes (minimum 44x44 points)
    - Add focus indicators to interactive elements
    - Test with screen reader (TalkBack/VoiceOver)
    - _Requirements: 8.1, 8.2, 8.4, 8.6_

  - [ ]\* 15.2 Write property test for accessibility labels completeness

    - **Property 21: Accessibility Labels Completeness**
    - **Validates: Requirements 8.1, 8.2**

  - [ ]\* 15.3 Write property test for touch target minimum size

    - **Property 22: Touch Target Minimum Size**
    - **Validates: Requirements 8.4**

  - [ ]\* 15.4 Write property test for focus indicator presence

    - **Property 23: Focus Indicator Presence**
    - **Validates: Requirements 8.6**

  - [ ]\* 15.5 Write unit tests for accessibility features
    - Test accessibility labels on all inputs
    - Test screen reader announcements for errors
    - Test touch target dimensions
    - Test focus indicators
    - _Requirements: 8.1, 8.2, 8.4, 8.6_

- [ ] 16. Integration testing and end-to-end flows

  - [ ]\* 16.1 Write integration tests for complete auth flows
    - Test new user flow: phone → OTP → role → profile → main app
    - Test returning user flow: auto-login → main app
    - Test logout and re-login flow
    - Test error recovery flows (network errors, invalid OTP, etc.)
    - Test role switching scenario (if supported)
    - _Requirements: All requirements_

- [ ] 17. Final checkpoint - Comprehensive testing and validation
  - Run all unit tests and ensure they pass
  - Run all property tests and ensure they pass
  - Run all integration tests and ensure they pass
  - Verify test coverage meets goals (80% line, 75% branch, 85% function)
  - Test manually on iOS and Android devices
  - Test with screen readers (TalkBack/VoiceOver)
  - Test with poor network conditions
  - Test error scenarios manually
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end user flows
- All async operations should have proper error handling and loading states
- All UI components should meet accessibility standards
- Firebase mocks should be used for all tests to avoid hitting real services
