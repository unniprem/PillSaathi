# Navigation Types

This directory contains type definitions and constants for the PillSathi app navigation structure.

## Files

### `navigation.js`

Defines navigation structure, screen names, and parameter types using JSDoc comments for type hints in JavaScript.

## Usage

### Importing Screen Constants

```javascript
import {
  RootScreens,
  AuthScreens,
  ParentScreens,
  CaregiverScreens,
} from './types/navigation';

// Navigate to a screen
navigation.navigate(AuthScreens.LOGIN);
navigation.navigate(ParentScreens.EDIT_MEDICINE, { medicineId: '123' });
```

### Using JSDoc Type Hints

Add JSDoc comments to your screen components for better IDE support:

```javascript
/**
 * @param {Object} props
 * @param {AuthNavigationProp} props.navigation
 * @param {RouteProp<AuthParamList, 'PhoneVerification'>} props.route
 */
function PhoneVerificationScreen({ navigation, route }) {
  const { phoneNumber, verificationId } = route.params;
  // Your component code
}
```

### Helper Functions

```javascript
import { getScreenNames, isValidScreen } from './types/navigation';

// Get all screen names for a navigator
const authScreens = getScreenNames('Auth');
// ['Login', 'PhoneVerification', 'RoleSelection']

// Validate a screen name
const isValid = isValidScreen('Auth', 'Login'); // true
```

## Navigation Structure

### Root Navigator

- Splash
- Auth (Navigator)
- Parent (Navigator)
- Caregiver (Navigator)

### Auth Navigator

- Login
- PhoneVerification
- RoleSelection

### Parent Navigator

- ParentHome
- ParentProfile
- MedicineList
- AddMedicine
- EditMedicine
- CaregiverManagement
- AddCaregiver
- Notifications
- Settings

### Caregiver Navigator

- CaregiverHome
- CaregiverProfile
- ParentList
- MedicineDetails
- Alarm
- Notifications
- Settings

## User Roles

```javascript
import { UserRole } from './types/navigation';

const role = UserRole.PARENT; // 'parent'
const role2 = UserRole.CAREGIVER; // 'caregiver'
```
