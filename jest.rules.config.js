// The Firestore rules tests, run on the emulator by `npm run test:rules`.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/firebase/**/*.test.ts'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
};
