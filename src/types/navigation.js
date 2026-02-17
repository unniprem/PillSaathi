/**
 * Navigation Types and Constants
 *
 * This file defines navigation structure, screen names, and param types
 * using JSDoc for type hints in JavaScript.
 *
 * @example
 * // Import screen constants
 * import { RootScreens, AuthScreens, ParentScreens } from './types/navigation';
 *
 * // Navigate to a screen
 * navigation.navigate(AuthScreens.LOGIN);
 *
 * // Navigate with params
 * navigation.navigate(ParentScreens.EDIT_MEDICINE, { medicineId: '123' });
 *
 * // Use JSDoc for type hints in your components
 * /**
 *  * @param {Object} props
 *  * @param {AuthNavigationProp} props.navigation
 *  * @param {RouteProp<AuthParamList, 'PhoneVerification'>} props.route
 *  *\/
 * function PhoneVerificationScreen({ navigation, route }) {
 *   const { phoneNumber, verificationId } = route.params;
 *   // ...
 * }
 *
 * @format
 */

// ============================================================================
// Screen Names (Constants)
// ============================================================================

/**
 * Root-level screen names
 * @readonly
 * @enum {string}
 */
export const RootScreens = {
  SPLASH: 'Splash',
  AUTH: 'Auth',
  PARENT: 'Parent',
  CAREGIVER: 'Caregiver',
};

/**
 * Authentication flow screen names
 * @readonly
 * @enum {string}
 */
export const AuthScreens = {
  LOGIN: 'Login',
  PHONE_VERIFICATION: 'PhoneVerification',
  ROLE_SELECTION: 'RoleSelection',
  PROFILE_SETUP: 'ProfileSetup',
};

/**
 * Parent-specific screen names
 * @readonly
 * @enum {string}
 */
export const ParentScreens = {
  HOME: 'ParentHome',
  PROFILE: 'ParentProfile',
  MEDICINE_LIST: 'MedicineList',
  ADD_MEDICINE: 'AddMedicine',
  EDIT_MEDICINE: 'EditMedicine',
  CAREGIVER_MANAGEMENT: 'CaregiverManagement',
  ADD_CAREGIVER: 'AddCaregiver',
  NOTIFICATIONS: 'Notifications',
  SETTINGS: 'Settings',
};

/**
 * Caregiver-specific screen names
 * @readonly
 * @enum {string}
 */
export const CaregiverScreens = {
  HOME: 'CaregiverHome',
  PROFILE: 'CaregiverProfile',
  PARENT_LIST: 'ParentList',
  MEDICINE_DETAILS: 'MedicineDetails',
  ALARM: 'Alarm',
  NOTIFICATIONS: 'Notifications',
  SETTINGS: 'Settings',
};

// ============================================================================
// Navigation Param Types (JSDoc)
// ============================================================================

/**
 * Root Navigator param list
 * @typedef {Object} RootParamList
 * @property {undefined} Splash - Splash screen (no params)
 * @property {undefined} Auth - Auth navigator (no params)
 * @property {undefined} Parent - Parent navigator (no params)
 * @property {undefined} Caregiver - Caregiver navigator (no params)
 */

/**
 * Auth Navigator param list
 * @typedef {Object} AuthParamList
 * @property {undefined} Login - Login screen (no params)
 * @property {Object} PhoneVerification - Phone verification screen
 * @property {string} PhoneVerification.phoneNumber - Phone number to verify
 * @property {string} PhoneVerification.verificationId - Firebase verification ID
 * @property {undefined} RoleSelection - Role selection screen (no params)
 * @property {undefined} ProfileSetup - Profile setup screen (no params)
 */

/**
 * Parent Navigator param list
 * @typedef {Object} ParentParamList
 * @property {undefined} ParentHome - Parent home screen (no params)
 * @property {undefined} ParentProfile - Parent profile screen (no params)
 * @property {undefined} MedicineList - Medicine list screen (no params)
 * @property {undefined} AddMedicine - Add medicine screen (no params)
 * @property {Object} EditMedicine - Edit medicine screen
 * @property {string} EditMedicine.medicineId - ID of medicine to edit
 * @property {undefined} CaregiverManagement - Caregiver management screen (no params)
 * @property {undefined} AddCaregiver - Add caregiver screen (no params)
 * @property {undefined} Notifications - Notifications screen (no params)
 * @property {undefined} Settings - Settings screen (no params)
 */

/**
 * Caregiver Navigator param list
 * @typedef {Object} CaregiverParamList
 * @property {undefined} CaregiverHome - Caregiver home screen (no params)
 * @property {undefined} CaregiverProfile - Caregiver profile screen (no params)
 * @property {undefined} ParentList - Parent list screen (no params)
 * @property {Object} MedicineDetails - Medicine details screen
 * @property {string} MedicineDetails.medicineId - ID of medicine to view
 * @property {string} MedicineDetails.parentId - ID of parent
 * @property {Object} Alarm - Alarm screen
 * @property {string} Alarm.medicineId - ID of medicine for alarm
 * @property {string} Alarm.scheduledTime - Scheduled time for alarm
 * @property {undefined} Notifications - Notifications screen (no params)
 * @property {undefined} Settings - Settings screen (no params)
 */

// ============================================================================
// Navigation Prop Types (JSDoc)
// ============================================================================

/**
 * Navigation prop for screens in Root Navigator
 * @typedef {Object} RootNavigationProp
 * @property {function(string, Object=): void} navigate - Navigate to a screen
 * @property {function(): void} goBack - Go back to previous screen
 * @property {function(string): void} replace - Replace current screen
 * @property {function(): void} reset - Reset navigation state
 * @property {function(function): function} addListener - Add navigation listener
 * @property {function(function): void} removeListener - Remove navigation listener
 */

/**
 * Navigation prop for screens in Auth Navigator
 * @typedef {Object} AuthNavigationProp
 * @property {function(string, Object=): void} navigate - Navigate to a screen
 * @property {function(): void} goBack - Go back to previous screen
 * @property {function(string): void} replace - Replace current screen
 */

/**
 * Navigation prop for screens in Parent Navigator
 * @typedef {Object} ParentNavigationProp
 * @property {function(string, Object=): void} navigate - Navigate to a screen
 * @property {function(): void} goBack - Go back to previous screen
 * @property {function(string): void} replace - Replace current screen
 */

/**
 * Navigation prop for screens in Caregiver Navigator
 * @typedef {Object} CaregiverNavigationProp
 * @property {function(string, Object=): void} navigate - Navigate to a screen
 * @property {function(): void} goBack - Go back to previous screen
 * @property {function(string): void} replace - Replace current screen
 */

// ============================================================================
// Route Prop Types (JSDoc)
// ============================================================================

/**
 * Route prop for screens
 * @template T
 * @typedef {Object} RouteProp
 * @property {string} key - Unique key for the route
 * @property {string} name - Name of the route
 * @property {T} params - Parameters passed to the route
 */

// ============================================================================
// User Role Type
// ============================================================================

/**
 * User role enum
 * @readonly
 * @enum {string}
 */
export const UserRole = {
  PARENT: 'parent',
  CAREGIVER: 'caregiver',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all screen names for a navigator
 * @param {string} navigator - Navigator name ('Root', 'Auth', 'Parent', 'Caregiver')
 * @returns {string[]} Array of screen names
 */
export function getScreenNames(navigator) {
  switch (navigator) {
    case 'Root':
      return Object.values(RootScreens);
    case 'Auth':
      return Object.values(AuthScreens);
    case 'Parent':
      return Object.values(ParentScreens);
    case 'Caregiver':
      return Object.values(CaregiverScreens);
    default:
      return [];
  }
}

/**
 * Check if a screen name is valid for a navigator
 * @param {string} navigator - Navigator name
 * @param {string} screenName - Screen name to validate
 * @returns {boolean} True if screen name is valid
 */
export function isValidScreen(navigator, screenName) {
  const screens = getScreenNames(navigator);
  return screens.includes(screenName);
}
