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
  signedInRelative: null,
  signInWithGoogle: null,
  scanCode: null,
  requestFollow: 'E',
  followState: 'pending',
  saveFollow: undefined,
  listFollows: [],
  unfollow: undefined,
  getFamily: [],
  refreshFamily: [],
  getElderToday: {
    date: '2026-10-26',
    cards: [],
    refills: [],
    heardAt: null,
    otherZone: false,
  },
  getElderHistory: {
    today: '2026-10-26',
    oldest: null,
    firstDayOfWeek: 0,
    doses: [],
  },
  listElderPills: [],
};
