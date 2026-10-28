/**
 * What each mocked `src/native/family` call resolves with unless a test says otherwise: a phone
 * that has never used Family. jest.setup.js and `mockFamilyDefaults` both use it.
 */
export const familyDefaults: Record<string, unknown> = {
  createLinkCode: {
    code: '482913',
    expiresAt: 0,
    qrUri: 'file:///cache/family/qr-482913.png',
  },
  watchRequests: undefined,
  pendingRequests: [],
  answerRequest: undefined,
  listFollowers: [],
  removeFollower: undefined,
};
