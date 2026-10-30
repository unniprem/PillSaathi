import * as alarms from '../../src/native/alarms';
import {
  afterReconcile,
  reconcileAppOpen,
  startRoute,
  takeMissed,
} from '../../src/lib/start';

jest.mock('../../src/native/alarms');

test('no role starts at the login page', () =>
  expect(startRoute({ role: null, account: null })).toEqual({
    name: 'Login',
    params: { again: false },
  }));

test('a role without an account shows the login page again', () =>
  expect(startRoute({ role: 'elder', account: null })).toEqual({
    name: 'Login',
    params: { again: true },
  }));

test('a set-up, logged-in phone starts at Today', () =>
  expect(
    startRoute({ role: 'carer', account: { name: 'Ravi', email: 'r@x' } }),
  ).toEqual({ name: 'Main' }));

// Google again could pick another account, and change a relative's id under the elders who follow it.
test('a logged-in phone never asked who it is for asks, without logging in again', () =>
  expect(
    startRoute({
      role: null,
      account: { name: 'Ravi Kumar', email: 'r@x' },
    }),
  ).toEqual({ name: 'Who', params: { first: 'Ravi' } }));

describe('the app-open reconcile', () => {
  const missed = (id: string) => ({ id, name: `Pill ${id}`, dueAt: 1 });

  beforeEach(() => {
    jest.clearAllMocks();
    takeMissed();
  });

  afterEach(() => jest.restoreAllMocks());

  test('keeps what it finds missed until it is taken, once', async () => {
    jest
      .mocked(alarms.reconcileOnAppOpen)
      .mockResolvedValueOnce([missed('a')])
      .mockResolvedValueOnce([missed('b')]);
    await reconcileAppOpen();
    await reconcileAppOpen();
    expect(alarms.reconcileOnAppOpen).toHaveBeenCalledTimes(2);
    expect(takeMissed()).toEqual([missed('a'), missed('b')]);
    expect(takeMissed()).toEqual([]);
  });

  test('a second call while one runs joins it', async () => {
    jest.mocked(alarms.reconcileOnAppOpen).mockResolvedValue([missed('a')]);
    await Promise.all([reconcileAppOpen(), reconcileAppOpen()]);
    expect(alarms.reconcileOnAppOpen).toHaveBeenCalledTimes(1);
    expect(takeMissed()).toEqual([missed('a')]);
  });

  test('tells each listener when it is done, until it stops listening', async () => {
    jest.mocked(alarms.reconcileOnAppOpen).mockResolvedValue([]);
    const heard = jest.fn();
    const stop = afterReconcile(heard);
    await reconcileAppOpen();
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
    await reconcileAppOpen();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  test('a failed reconcile never rejects, and the next one still runs', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest
      .mocked(alarms.reconcileOnAppOpen)
      .mockRejectedValueOnce(new Error('disk'))
      .mockResolvedValueOnce([missed('a')]);
    const heard = jest.fn();
    const stop = afterReconcile(heard);
    await expect(reconcileAppOpen()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      'Could not reconcile alarms',
      expect.any(Error),
    );
    // Today still reads the day again.
    expect(heard).toHaveBeenCalledTimes(1);
    await reconcileAppOpen();
    expect(takeMissed()).toEqual([missed('a')]);
    stop();
  });

  test('a call that throws at once never rejects either', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.mocked(alarms.reconcileOnAppOpen).mockImplementationOnce(() => {
      throw new Error('no module');
    });
    await expect(reconcileAppOpen()).resolves.toBeUndefined();
    jest.mocked(alarms.reconcileOnAppOpen).mockResolvedValueOnce([]);
    await reconcileAppOpen();
    expect(alarms.reconcileOnAppOpen).toHaveBeenCalledTimes(2);
  });
});
