# Cloud Functions for PillSathi

This directory contains Firebase Cloud Functions for the PillSathi application.

## Setup

1. Install dependencies:

```bash
cd functions
npm install
```

2. Ensure Firebase CLI is installed:

```bash
npm install -g firebase-tools
```

3. Login to Firebase:

```bash
firebase login
```

## Development

### Running Functions Locally

Use the Firebase Emulator Suite to test functions locally:

```bash
cd functions
npm run serve
```

This will start the functions emulator on http://localhost:5001

### Testing Functions

Run tests:

```bash
cd functions
npm test
```

## Deployment

Deploy all functions:

```bash
cd functions
npm run deploy
```

Deploy a specific function:

```bash
firebase deploy --only functions:redeemInviteCode
```

## Available Functions

### redeemInviteCode

Callable HTTPS function that redeems an invite code to create a parent-caregiver relationship.

**Parameters:**

- `code` (string): 8-character alphanumeric invite code
- `caregiverUid` (string): Firebase Auth UID of the caregiver

**Returns:**

- `success` (boolean): Whether the operation succeeded
- `relationshipId` (string): ID of the created/existing relationship
- `message` (string): Success message

**Errors:**

- `unauthenticated`: User is not authenticated
- `invalid-argument`: Invalid input parameters or code format
- `permission-denied`: User trying to redeem for someone else
- `not-found`: Invalid invite code
- `failed-precondition`: Invite code has expired
- `internal`: Unexpected server error

**Client Usage:**

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
  console.error('Error:', error.message);
}
```

## Project Structure

```
functions/
├── index.js           # Main functions entry point
├── package.json       # Dependencies and scripts
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## Requirements Mapping

The `redeemInviteCode` function implements the following requirements:

- **3.1**: Validate code format (8 characters, alphanumeric)
- **3.2**: Verify code exists in Firestore
- **3.3**: Check if code has expired
- **3.4**: Return appropriate errors for invalid/expired codes
- **3.5**: Create relationship when valid code is redeemed
- **3.6**: Store parentUid, caregiverUid, and createdAt in relationship
- **3.7**: Handle duplicate relationships (idempotence)
- **7.5**: Validate authentication before processing

## Security

- All functions require authentication
- Users can only redeem codes for themselves
- Code validation happens server-side to prevent tampering
- Firestore security rules provide additional protection

## Monitoring

View function logs:

```bash
npm run logs
```

Or in Firebase Console:
https://console.firebase.google.com/project/YOUR_PROJECT_ID/functions/logs
