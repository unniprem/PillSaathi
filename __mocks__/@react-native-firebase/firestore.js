/**
 * Mock for @react-native-firebase/firestore
 * Used for testing Firestore operations without hitting real Firebase services
 */

const mockDocumentSnapshot = {
  exists: false,
  id: 'test-doc-id',
  data: jest.fn(() => null),
};

const mockDocumentReference = {
  set: jest.fn(() => Promise.resolve()),
  get: jest.fn(() => Promise.resolve(mockDocumentSnapshot)),
  update: jest.fn(() => Promise.resolve()),
  delete: jest.fn(() => Promise.resolve()),
};

const mockCollectionReference = {
  doc: jest.fn(() => mockDocumentReference),
  add: jest.fn(() => Promise.resolve(mockDocumentReference)),
  get: jest.fn(() => Promise.resolve({ docs: [] })),
};

const mockFirestore = {
  collection: jest.fn(() => mockCollectionReference),
  doc: jest.fn(() => mockDocumentReference),
  batch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(() => Promise.resolve()),
  })),
  runTransaction: jest.fn(updateFunction => {
    return Promise.resolve(
      updateFunction({
        get: jest.fn(() => Promise.resolve(mockDocumentSnapshot)),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      }),
    );
  }),
};

const firestore = jest.fn(() => mockFirestore);

// Export getFirestore function
export const getFirestore = jest.fn(() => mockFirestore);

// Export Firestore timestamp mock
firestore.FieldValue = {
  serverTimestamp: jest.fn(() => new Date()),
  delete: jest.fn(() => 'DELETE_FIELD'),
  increment: jest.fn(n => `INCREMENT_${n}`),
  arrayUnion: jest.fn((...elements) => `ARRAY_UNION_${elements.join(',')}`),
  arrayRemove: jest.fn((...elements) => `ARRAY_REMOVE_${elements.join(',')}`),
};

firestore.Timestamp = {
  now: jest.fn(() => ({
    toDate: () => new Date(),
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0,
  })),
  fromDate: jest.fn(date => ({
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  })),
};

// Export default function that returns the mock firestore instance
export default firestore;

// Export mock objects for test manipulation
export {
  mockFirestore,
  mockCollectionReference,
  mockDocumentReference,
  mockDocumentSnapshot,
};
