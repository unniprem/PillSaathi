# Future Enhancements

This document tracks planned features and improvements for future development.

## 1. Medicine Management Enhancements

### Medicine Type & Form

- Add support for different medicine forms:
  - Tablets
  - Syrup/Liquid
  - Capsules
  - Injections
  - Other forms

### Timing Instructions

- Add detailed timing options for medicine intake:
  - Before food (with time options: 1 hour, 30 minutes, 15 minutes)
  - After food (with time options: immediately, 30 minutes, 1 hour)
  - With food
  - On empty stomach
  - At specific times (morning, afternoon, evening, night)

### Additional Fields

- Dosage unit (mg, ml, tablets, etc.)
- Duration of treatment
- Special instructions/notes
- Side effects to watch for

## 2. Code Generation & Pairing Improvements

### Move to Profile Section

- Relocate "Generate Code" functionality from current location to Profile screen
- Implement for both user types:
  - Caregiver Profile: Generate pairing code
  - Parent Profile: Generate pairing code
- Add "Pairing Management" section in profiles:
  - View active pairings
  - Generate new codes
  - Revoke/delete pairings
  - View pairing history

## 3. Profile Updates

### Enhanced Profile Features

- Add profile photo upload
- Add more personal information fields
- Add notification preferences
- Add language preferences
- Add timezone settings
- Add emergency contact information

### Profile Management

- Edit profile information
- Change password/authentication
- Account settings
- Privacy settings

## 4. Dashboard Fixes

### Caregiver Dashboard

- Fix dose count display showing "0 doses" for each parent
- Implement proper dose counting logic:
  - Count total doses given today
  - Count pending doses
  - Count missed doses
  - Show accurate statistics per parent
- Add visual indicators for dose status
- Add quick action buttons for common tasks

### Dashboard Improvements

- Add date range filters
- Add summary cards with key metrics
- Add charts/graphs for dose history
- Add quick access to frequently used features

## Priority

1. High Priority:

   - Fix caregiver dashboard dose count (Item 4)
   - Move pairing to profile (Item 2)

2. Medium Priority:

   - Medicine timing instructions (Item 1)
   - Profile enhancements (Item 3)

3. Future Consideration:
   - Medicine form types (Item 1)
   - Advanced profile features (Item 3)

## Notes

- Each enhancement should be implemented with proper testing
- UI/UX should be consistent with existing design
- Consider accessibility in all new features
- Ensure proper error handling and validation
