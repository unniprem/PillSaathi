# Invite Code System Fixes

## Summary

Fixed multiple issues with the invite code pairing system:

1. ✅ Invite code expiration changed from 24 hours to 15 minutes
2. ✅ Only caregivers can remove parent relationships
3. ✅ Parent app updates automatically when relationship is removed (via real-time listeners)
4. ✅ Fixed "please log into continue" error handling
5. ✅ Invite codes can only be redeemed once
6. ✅ "Generate New Code" button always visible to update/regenerate codes
7. ✅ Same caregiver cannot be added twice to the same parent

## Changes Made

### 1. Invite Code Expiration (15 minutes)

**File: `src/services/pairing/InviteCodeService.js`**

- Changed `calculateExpiration()` method from hours to minutes
- Updated default parameter from 24 hours to 15 minutes
- Updated all documentation to reflect 15-minute expiration

### 2. Caregiver-Only Removal

**File: `functions/index.js`**

- Updated `removeRelationship` Cloud Function to only allow caregivers
- Changed permission check from "parent OR caregiver" to "caregiver only"
- Updated error message to "Only caregivers can remove relationships"

**File: `src/contexts/PairingContext.js`**

- Added role check in `removeRelationship()` method
- Throws `permission-denied` error if user is not a caregiver
- Added same check to DevPairingHelper path

**File: `src/services/pairing/DevPairingHelper.js`**

- Added new `removeRelationshipDev()` method for development testing
- Implements same caregiver-only permission check
- Validates relationship exists before deletion

**File: `src/screens/parent/ParentPairingScreen.js`**

- Removed `onRemove` handler from RelationshipCard
- Added `showRemoveButton={false}` prop to hide remove button for parents

**File: `src/components/pairing/RelationshipCard.js`**

- Added `showRemoveButton` prop (default: true)
- Conditionally renders remove button based on prop
- Updated documentation

### 3. Real-Time Updates for Parent App

**Already Working:**
The real-time listener in `PairingContext.js` automatically updates both parent and caregiver apps when a relationship is removed. The `subscribeToRelationships()` method listens to Firestore changes and updates the UI immediately.

### 4. Error Message Handling

**File: `src/constants/errorMessages.js`**

- Updated `getErrorMessage()` function to accept optional `fallbackMessage` parameter
- Now returns: error code message → fallback message → default message
- Prevents generic "please log into continue" errors when more specific messages are available
- Added `code-already-used` error message

### 5. Single-Use Invite Codes

**File: `functions/index.js`**

- Added check for `used` field before creating relationship
- Throws `failed-precondition` error if code already used
- Marks code as `used: true` after successful redemption
- Stores `usedAt` timestamp and `usedBy` caregiver UID
- Changed from idempotent to error on duplicate relationship attempts

**File: `src/services/pairing/DevPairingHelper.js`**

- Added same `used` field check in dev helper
- Marks code as used after successful redemption
- Stores usage metadata (usedAt, usedBy)
- Throws error if caregiver already connected to parent

**File: `src/services/pairing/InviteCodeService.js`**

- Initializes new codes with `used: false` field
- Always generates new code (no longer returns existing active code)
- Invalidates old active codes by setting their expiration to now

**File: `src/services/pairing/CloudFunctionsService.js`**

- Updated error mapping to distinguish between expired and already-used codes
- Returns specific error message for already-used codes
- Added mapping for `already-exists` error

### 6. Generate New Code Button

**File: `src/components/pairing/InviteCodeDisplay.js`**

- Added "Generate New Code" button below Copy/Share buttons
- Button visible even when code is active (not just when expired)
- Allows parents to update/regenerate codes at any time
- Uses orange color to distinguish from primary actions

### 7. Prevent Duplicate Caregiver-Parent Relationships

**File: `functions/index.js`**

- Changed relationship check from idempotent to error-throwing
- Throws `already-exists` error if caregiver already connected to parent
- Prevents same caregiver from redeeming multiple codes for same parent

**File: `src/services/pairing/DevPairingHelper.js`**

- Same duplicate prevention logic in dev helper
- Throws `already-exists` error for duplicate relationships

**File: `src/constants/errorMessages.js`**

- Added `already-exists` error message
- User-friendly message: "You are already connected with this parent"

## Testing Checklist

### Invite Code Expiration

- [ ] Generate invite code as parent
- [ ] Verify code expires after 15 minutes
- [ ] Try to redeem expired code - should show "code expired" error

### Single-Use Invite Codes

- [ ] Generate invite code as parent
- [ ] Redeem code as caregiver #1 - should succeed
- [ ] Try to redeem same code as caregiver #2 - should show "already been used" error
- [ ] Verify code is marked as `used: true` in Firestore
- [ ] Verify `usedAt` and `usedBy` fields are set correctly

### Generate New Code Button

- [ ] Generate invite code as parent
- [ ] Verify "Generate New Code" button is visible below Copy/Share buttons
- [ ] Click "Generate New Code" - should create new code
- [ ] Verify old code is invalidated (expiresAt set to now)
- [ ] Verify new code is displayed with fresh 15-minute timer

### Prevent Duplicate Relationships

- [ ] As caregiver: Redeem code from parent - should succeed
- [ ] As same caregiver: Try to redeem another code from same parent - should show "already connected" error
- [ ] Verify only one relationship exists in Firestore
- [ ] As different caregiver: Redeem code from same parent - should succeed

### Caregiver-Only Removal

- [ ] As caregiver: Remove parent relationship - should succeed
- [ ] As parent: Try to remove caregiver - remove button should not be visible
- [ ] Verify parent sees caregiver list but cannot remove them

### Real-Time Updates

- [ ] As caregiver: Remove parent relationship
- [ ] Verify parent app immediately shows relationship removed
- [ ] Verify caregiver app immediately shows relationship removed

### Error Messages

- [ ] Try to redeem invalid code - should show specific error
- [ ] Try to redeem expired code - should show "code expired" message
- [ ] Try operations without authentication - should show appropriate error

## Development Mode

The system uses `USE_DEV_HELPER = true` in `PairingContext.js` for local testing without deployed Cloud Functions. This uses:

- `DevPairingHelper.redeemInviteCodeDev()` for code redemption
- `DevPairingHelper.removeRelationshipDev()` for relationship removal

Set `USE_DEV_HELPER = false` when Cloud Functions are deployed to production.

## Cloud Functions Deployment

After testing, deploy the updated Cloud Functions:

```bash
cd functions
npm install
firebase deploy --only functions
```

Then update `src/contexts/PairingContext.js`:

```javascript
const USE_DEV_HELPER = false; // Switch to production mode
```
