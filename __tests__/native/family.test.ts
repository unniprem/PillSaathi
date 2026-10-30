import type * as FamilyModule from '../../src/native/family';

// jest.setup.js mocks the wrapper for every screen test; this file tests the real one.
jest.unmock('../../src/native/family');

afterEach(() => jest.resetModules());

function load(native: object | null): typeof FamilyModule {
  jest.doMock('../../specs/NativeFamily', () => ({
    __esModule: true,
    default: native,
  }));
  return require('../../src/native/family');
}

test('rejects when the native module is missing (iOS)', async () => {
  const family = load(null);
  await expect(family.createLinkCode()).rejects.toThrow(
    'PillSaathi family is Android-only for now',
  );
  await expect(family.listFollowers()).rejects.toThrow(
    'PillSaathi family is Android-only for now',
  );
  await expect(family.pendingRequests()).rejects.toThrow(
    'PillSaathi family is Android-only for now',
  );
});

test('passes the elder calls and results through to the native module', async () => {
  const code = {
    code: '482913',
    expiresAt: 1_800_000,
    qrUri: 'file:///cache/qr.png',
  };
  const ravi = { uid: 'R', name: 'Ravi', email: 'ravi@gmail.com' };
  const native = {
    createLinkCode: jest.fn().mockResolvedValue(code),
    watchRequests: jest.fn().mockResolvedValue(undefined),
    pendingRequests: jest.fn().mockResolvedValue([ravi]),
    answerRequest: jest.fn().mockResolvedValue(undefined),
    listFollowers: jest.fn().mockResolvedValue([ravi]),
    removeFollower: jest.fn().mockResolvedValue(undefined),
  };
  const family = load(native);

  await expect(family.createLinkCode()).resolves.toEqual(code);
  await family.watchRequests(true);
  expect(native.watchRequests).toHaveBeenCalledWith(true);
  await expect(family.pendingRequests()).resolves.toEqual([ravi]);
  await family.answerRequest('R', true);
  expect(native.answerRequest).toHaveBeenCalledWith('R', true);
  await expect(family.listFollowers()).resolves.toEqual([ravi]);
  await family.removeFollower('R');
  expect(native.removeFollower).toHaveBeenCalledWith('R');
});

test('rejects the relative calls when the native module is missing (iOS)', async () => {
  const family = load(null);
  await expect(family.signInWithGoogle()).rejects.toThrow(
    'PillSaathi family is Android-only for now',
  );
  await expect(family.requestFollow('482913')).rejects.toThrow(
    'PillSaathi family is Android-only for now',
  );
  await expect(family.listFollows()).rejects.toThrow(
    'PillSaathi family is Android-only for now',
  );
});

test('passes the relative calls and results through to the native module', async () => {
  const ravi = { name: 'Ravi', email: 'ravi@gmail.com' };
  const amma = {
    elderId: 'E',
    name: 'Amma',
    phone: null,
    delayMinutes: 30,
  };
  const native = {
    signedInRelative: jest.fn().mockResolvedValue(null),
    signInWithGoogle: jest.fn().mockResolvedValue(ravi),
    scanCode: jest.fn().mockResolvedValue('482913'),
    requestFollow: jest.fn().mockResolvedValue('E'),
    followState: jest.fn().mockResolvedValue('allowed'),
    saveFollow: jest.fn().mockResolvedValue(undefined),
    listFollows: jest.fn().mockResolvedValue([amma]),
    unfollow: jest.fn().mockResolvedValue(undefined),
  };
  const family = load(native);

  await expect(family.signedInRelative()).resolves.toBeNull();
  await expect(family.signInWithGoogle()).resolves.toEqual(ravi);
  await expect(family.scanCode()).resolves.toBe('482913');
  await expect(family.requestFollow('482913')).resolves.toBe('E');
  expect(native.requestFollow).toHaveBeenCalledWith('482913');
  await expect(family.followState('E')).resolves.toBe('allowed');
  expect(native.followState).toHaveBeenCalledWith('E');
  await family.saveFollow(amma);
  expect(native.saveFollow).toHaveBeenCalledWith(amma);
  await expect(family.listFollows()).resolves.toEqual([amma]);
  await family.unfollow('E', true);
  expect(native.unfollow).toHaveBeenCalledWith('E', true);
});

test('rejects the elder views when the native module is missing (iOS)', async () => {
  const family = load(null);
  await expect(family.getFamily()).rejects.toThrow(
    'PillSaathi family is Android-only for now',
  );
  await expect(family.refreshFamily()).rejects.toThrow(
    'PillSaathi family is Android-only for now',
  );
  await expect(family.getElderToday('E')).rejects.toThrow(
    'PillSaathi family is Android-only for now',
  );
});

test('passes the elder views through to the native module', async () => {
  const card = {
    elderId: 'E',
    name: 'Amma',
    phone: null,
    delayMinutes: 30,
    heardAt: 1_000,
    silent: false,
    abandoned: false,
    otherZone: false,
    tally: { taken: 1, skipped: 0, missed: 0, notReported: 1, later: 1 },
    refills: [],
  };
  const today = {
    date: '2026-10-28',
    cards: [],
    refills: [],
    heardAt: 1_000,
    otherZone: false,
  };
  const history = {
    today: '2026-10-28',
    oldest: '2026-10-01',
    firstDayOfWeek: 0,
    doses: [],
  };
  const native = {
    getFamily: jest.fn().mockResolvedValue([card]),
    refreshFamily: jest.fn().mockResolvedValue([card]),
    getElderToday: jest.fn().mockResolvedValue(today),
    getElderHistory: jest.fn().mockResolvedValue(history),
    listElderPills: jest.fn().mockResolvedValue([]),
  };
  const family = load(native);

  await expect(family.getFamily()).resolves.toEqual([card]);
  await expect(family.refreshFamily()).resolves.toEqual([card]);
  await expect(family.getElderToday('E')).resolves.toEqual(today);
  expect(native.getElderToday).toHaveBeenCalledWith('E');
  await expect(
    family.getElderHistory('E', '2026-10-01', '2026-10-31'),
  ).resolves.toEqual(history);
  expect(native.getElderHistory).toHaveBeenCalledWith(
    'E',
    '2026-10-01',
    '2026-10-31',
  );
  await expect(family.listElderPills('E')).resolves.toEqual([]);
  expect(native.listElderPills).toHaveBeenCalledWith('E');
});

test('names the error codes the module rejects with', () => {
  const family = load(null);
  expect(family.FamilyErrors).toEqual({
    NotSetUp: 'NOT_SET_UP',
    Offline: 'OFFLINE',
    GoogleFailed: 'GOOGLE_FAILED',
    BadCode: 'BAD_CODE',
    NotSignedIn: 'NOT_SIGNED_IN',
    NoActivity: 'NO_ACTIVITY',
    NotFound: 'NOT_FOUND',
    Permission: 'PERMISSION',
    NoScanner: 'NO_SCANNER',
    NotAllowed: 'NOT_ALLOWED',
    TooBig: 'TOO_BIG',
    AlreadyTaken: 'ALREADY_TAKEN',
  });
});

test('passes the remote setup calls through to the native module', async () => {
  const setup = {
    editor: true,
    otherZone: false,
    heardAt: null,
    pills: [],
    times: [{ hour: 8, minute: 0, soundId: null, soundName: null }],
    sounds: [],
    problem: null,
  };
  const input = {
    id: null,
    name: 'Telma 40',
    form: 'tablet',
    amount: 1,
    times: [{ hour: 8, minute: 0 }],
    startsTomorrow: false,
    days: null,
    photo: null,
    remaining: null,
    remainingChanged: false,
    photoChoice: 'none',
  };
  const native = {
    getElderSetup: jest.fn().mockResolvedValue(setup),
    sendPill: jest.fn().mockResolvedValue('c1'),
    sendDeletePill: jest.fn().mockResolvedValue('c2'),
    sendSound: jest.fn().mockResolvedValue('c3'),
    listChanges: jest.fn().mockResolvedValue([]),
    cancelChange: jest.fn().mockResolvedValue(undefined),
  };
  const family = load(native);
  await expect(family.getElderSetup('E')).resolves.toEqual(setup);
  await expect(family.sendPill('E', input)).resolves.toBe('c1');
  expect(native.sendPill).toHaveBeenCalledWith('E', input);
  await expect(family.sendDeletePill('E', 'p1')).resolves.toBe('c2');
  expect(native.sendDeletePill).toHaveBeenCalledWith('E', 'p1');
  await expect(family.sendSound('E', 8, 0, 'mine', 's1')).resolves.toBe('c3');
  expect(native.sendSound).toHaveBeenCalledWith('E', 8, 0, 'mine', 's1');
  await expect(family.listChanges('E')).resolves.toEqual([]);
  await family.cancelChange('E', 'c1');
  expect(native.cancelChange).toHaveBeenCalledWith('E', 'c1');
});
