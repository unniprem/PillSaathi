# Pairing Context Fix - redeemInviteCode Error

## Issue

CaregiverPairingScreen was crashing with error:

```
TypeError: undefined is not a function
at CaregiverPairingScreen.js:127:29
```

The error occurred when trying to call `redeemInviteCode(code)`.

## Root Cause

The `PairingContext` had three issues:

1. **Missing Export**: The `redeemInviteCode` function was defined in the context but NOT included in the exported `value` object
2. **Missing Import**: `InviteCodeService` was used but not imported
3. **Invalid Function Call**: `setInviteCode(code)` was called but this function doesn't exist

## What Was Fixed

### 1. Added Missing Import

```javascript
import InviteCodeService from '../services/pairing/InviteCodeService';
```

### 2. Fixed generateInviteCode Function

Removed the invalid `setInviteCode(code)` call:

```javascript
// Before (broken):
const code = await InviteCodeService.generateInviteCode(user.uid);
setInviteCode(code); // ❌ This function doesn't exist
return code;

// After (fixed):
const code = await InviteCodeService.generateInviteCode(user.uid);
return code; // ✅ Just return the code
```

### 3. Added Functions to Context Value

Updated the exported context value to include the missing functions:

```javascript
const value = {
  relationships,
  loading,
  error,
  generateInviteCode, // ✅ Added
  redeemInviteCode, // ✅ Added
  removeRelationship,
  refreshRelationships,
};
```

## Testing

After this fix, caregivers should be able to:

1. Enter an 8-character invite code
2. Click "Redeem Code"
3. Successfully connect with a parent
4. See the parent appear in their "Linked Parents" list

## Files Modified

- `src/contexts/PairingContext.js`

## Related Files

- `src/screens/caregiver/CaregiverPairingScreen.js` (uses the fixed context)
- `src/services/pairing/InviteCodeService.js` (now properly imported)
- `src/services/pairing/PairingService.js` (used by redeemInviteCode)
