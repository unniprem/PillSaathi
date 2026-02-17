/**
 * Mock for @react-native-firebase/auth
 * Used for testing authentication functionality without hitting real Firebase services
 */

const mockUser = {
  uid: 'test-uid-123',
  phoneNumber: '+1234567890',
  emailVerified: false,
  metadata: {
    creationTime: '2024-01-01T00:00:00.000Z',
    lastSignInTime: '2024-01-01T00:00:00.000Z',
  },
};

const mockConfirmation = {
  confirm: jest.fn(),
};

const mockAuth = {
  signInWithPhoneNumber: jest.fn(() => Promise.resolve(mockConfirmation)),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn(callback => {
    // Immediately call with null user for testing
    callback(null);
    // Return unsubscribe function
    return jest.fn();
  }),
  currentUser: null,
};

const auth = jest.fn(() => mockAuth);

// Export default function that returns the mock auth instance
export default auth;

// Export mock objects for test manipulation
export { mockUser, mockConfirmation, mockAuth };
