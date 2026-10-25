import { listSounds } from '../../src/native/sounds';
import type * as SoundsModule from '../../src/native/sounds';

jest.mock('../../specs/NativeSounds', () => ({
  __esModule: true,
  default: null,
}));

test('rejects when the native module is missing (iOS)', async () => {
  await expect(listSounds()).rejects.toThrow(
    'PillSaathi alarms are Android-only for now',
  );
});

test('passes calls and results through to the native module', async () => {
  const native = {
    listSounds: jest.fn().mockResolvedValue([
      {
        id: 's1',
        name: 'Amma voice',
        kind: 'recorded',
        durationMs: 12000,
        createdAt: 1,
        usedBy: ['Morning tablet'],
      },
    ]),
    saveRecording: jest.fn().mockResolvedValue({
      id: 's2',
      name: 'My recording',
      kind: 'recorded',
      durationMs: 3000,
      createdAt: 2,
      usedBy: [],
    }),
  };
  jest.resetModules();
  jest.doMock('../../specs/NativeSounds', () => ({
    __esModule: true,
    default: native,
  }));
  const sounds: typeof SoundsModule = require('../../src/native/sounds');

  await expect(sounds.listSounds()).resolves.toEqual([
    {
      id: 's1',
      name: 'Amma voice',
      kind: 'recorded',
      durationMs: 12000,
      createdAt: 1,
      usedBy: ['Morning tablet'],
    },
  ]);
  await expect(sounds.saveRecording('')).resolves.toMatchObject({ id: 's2' });
  expect(native.saveRecording).toHaveBeenCalledWith('');
});
