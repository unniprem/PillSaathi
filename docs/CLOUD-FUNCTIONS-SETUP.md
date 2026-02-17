# Cloud Functions Setup Guide

This guide explains how to set up and deploy Firebase Cloud Functions for the PillSathi application.

## Prerequisites

1. Firebase CLI installed globally:

```bash
npm install -g firebase-tools
```

2. Firebase project configured (already done in this project)

3. Node.js 22 or higher

## Installation

### 1. Install Functions Dependencies

```bash
cd functions
npm install
```

### 2. Install Client-Side Functions Package

The client app needs the Firebase Functions package to call Cloud Functions:

```bash
npm install @react-native-firebase/functions
```

### 3. Configure Firebase Functions in firebase.json

Already configured in `firebase.json`:

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs22"
  }
}
```

## Development

### Running Functions Locally

Use the Firebase Emulator Suite:

```bash
cd functions
npm run serve
```

This starts the functions emulator on http://localhost:5001

### Testing Functions

The Cloud Function can be tested using:

1. **Firebase Emulator UI**: http://localhost:4000 (when emulators are running)
2. **Direct HTTP calls**: Using curl or Postman
3. **Client app**: Connect the React Native app to the emulator

To connect the app to the emulator, add this to your Firebase initialization:

```javascript
import {
  getFunctions,
  connectFunctionsEmulator,
} from '@react-native-firebase/functions';

const functions = getFunctions();

if (__DEV__) {
  // Connect to emulator in development
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

## Deployment

### Deploy All Functions

```bash
cd functions
npm run deploy
```

### Deploy Specific Function

```bash
firebase deploy --only functions:redeemInviteCode
```

### View Deployment Status

```bash
firebase functions:list
```

## Available Functions

### redeemInviteCode

**Type**: Callable HTTPS Function  
**Purpose**: Redeem an invite code to create a parent-caregiver relationship

**Client Usage**:

```javascript
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

const functions = getFunctions();
const redeemInviteCode = httpsCallable(functions, 'redeemInviteCode');

try {
  const result = await redeemInviteCode({
    code: 'ABC12345',
    caregiverUid: currentUser.uid,
  });

  console.log('Success:', result.data.message);
  console.log('Relationship ID:', result.data.relationshipId);
} catch (error) {
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
}
```

**Using CloudFunctionsService** (recommended):

```javascript
import cloudFunctionsService from './src/services/pairing/CloudFunctionsService';

try {
  const result = await cloudFunctionsService.redeemInviteCode(
    'ABC12345',
    currentUser.uid,
  );

  console.log('Relationship created:', result.relationshipId);
} catch (error) {
  // Error is already mapped to user-friendly message
  console.error(error.message);
}
```

## Error Handling

The Cloud Function returns these error codes:

- `unauthenticated`: User is not authenticated
- `invalid-argument`: Invalid input parameters or code format
- `permission-denied`: User trying to redeem for someone else
- `not-found`: Invalid invite code
- `failed-precondition`: Invite code has expired
- `internal`: Unexpected server error

The `CloudFunctionsService` automatically maps these to user-friendly messages.

## Monitoring

### View Function Logs

```bash
npm run logs
```

Or view in Firebase Console:
https://console.firebase.google.com/project/YOUR_PROJECT_ID/functions/logs

### Monitor Function Performance

Firebase Console > Functions > Dashboard shows:

- Invocation count
- Execution time
- Error rate
- Memory usage

## Security

- All functions require authentication
- Users can only redeem codes for themselves
- Code validation happens server-side
- Firestore security rules provide additional protection

## Troubleshooting

### Function Not Found

If you get "Function not found" error:

1. Ensure functions are deployed: `firebase deploy --only functions`
2. Check function name matches exactly: `redeemInviteCode`
3. Verify Firebase project is correct

### Permission Denied

If you get permission errors:

1. Ensure user is authenticated
2. Check Firestore security rules
3. Verify user has correct role

### Timeout Errors

If functions timeout:

1. Check Firestore indexes are created
2. Optimize queries
3. Increase function timeout in firebase.json

## Next Steps

1. Install the Firebase Functions package: `npm install @react-native-firebase/functions`
2. Deploy the functions: `cd functions && npm run deploy`
3. Test the redeemInviteCode function from the app
4. Implement the removeRelationship function (Task 6)
5. Implement the cleanupExpiredInviteCodes scheduled function (Task 7)

## Resources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [React Native Firebase Functions](https://rnfirebase.io/functions/usage)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
