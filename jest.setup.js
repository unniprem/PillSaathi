/* eslint-env jest */
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Every screen test gets a family module with nothing in it; family.test.ts unmocks it.
jest.mock('./src/native/family', () => {
  const { familyDefaults } = require('./__tests__/helpers/familyDefaults');
  const mocked = {
    __esModule: true,
    FamilyErrors: jest.requireActual('./src/native/family').FamilyErrors,
  };
  for (const [name, value] of Object.entries(familyDefaults)) {
    mocked[name] = jest.fn(() => Promise.resolve(value));
  }
  return mocked;
});
