import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as family from '../../src/native/family';
import type {
  ChangeView,
  ElderSetup,
  FamilyCard,
} from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults, mockFamilyDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

const amma: FamilyCard = {
  elderId: 'E',
  name: 'Amma',
  phone: null,
  delayMinutes: 30,
  heardAt: null,
  silent: false,
  abandoned: false,
  otherZone: false,
  tally: { taken: 0, skipped: 0, missed: 0, notReported: 0, later: 0 },
  refills: [],
};

const telma = {
  id: 'p1',
  name: 'Telma 40',
  form: 'tablet',
  amount: 1,
  times: [{ hour: 8, minute: 0 }],
  startDate: '2026-10-01',
  days: null,
  photo: null,
  photoUri: null,
  remaining: null,
};

const setup: ElderSetup = {
  editor: true,
  otherZone: false,
  heardAt: null,
  pills: [telma, { ...telma, id: 'p2', name: 'Azee 500' }],
  times: [{ hour: 8, minute: 0, soundId: 's1', soundName: "Ravi's sound" }],
  sounds: [{ id: 's1', name: "Ravi's sound" }],
  problem: null,
};

function change(extra: Partial<ChangeView>): ChangeView {
  return {
    id: 'c1',
    kind: 'pill',
    status: 'pending',
    reason: null,
    mine: true,
    byName: 'Ravi',
    at: new Date(2026, 9, 29, 14, 0).getTime(),
    doneAt: null,
    pillId: 'p1',
    pillName: 'Telma 40',
    hour: null,
    minute: null,
    soundName: null,
    ...extra,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
  jest.mocked(sounds.onPreviewEnded).mockReturnValue({ remove: jest.fn() });
  jest.mocked(sounds.stopPreview).mockResolvedValue();
  jest.mocked(family.getFamily).mockResolvedValue([amma]);
  jest.mocked(family.getElderSetup).mockResolvedValue(setup);
});

afterEach(() => jest.restoreAllMocks());

test('lists her pills and times, waiting first, and Cancel cancels', async () => {
  jest.mocked(family.listChanges).mockResolvedValue([
    change({}),
    change({
      id: 'c2',
      status: 'applied',
      kind: 'deletePill',
      pillId: 'p9',
      pillName: 'Dolo',
      doneAt: new Date(2026, 9, 29, 15, 5).getTime(),
    }),
  ]);
  await renderApp('ElderPills', { elderId: 'E' });
  expect(await screen.findByText('Change Telma 40')).toBeTruthy();
  expect(headerTitles()).toEqual(["Amma's pills"]);
  expect(
    screen.getAllByText("Waiting for Amma's phone").length,
  ).toBeGreaterThan(0);
  expect(screen.getByText('Azee 500')).toBeTruthy();
  expect(screen.getByText("8:00 AM · Ravi's sound")).toBeTruthy();
  expect(screen.getByText('Delete Dolo')).toBeTruthy();
  expect(screen.getByText('Done at 3:05 PM')).toBeTruthy();
  expect(
    screen.getByText(
      "Amma's phone checks in about once an hour, and when an alarm rings. To send it now, ask her to open PillSaathi.",
    ),
  ).toBeTruthy();
  jest.mocked(family.listChanges).mockResolvedValue([]);
  await fireEvent.press(
    screen.getByRole('button', { name: 'Cancel Change Telma 40' }),
  );
  expect(family.cancelChange).toHaveBeenCalledWith('E', 'c1');
  await waitFor(() => expect(screen.queryByText('Change Telma 40')).toBeNull());
});

test('a cancel that is too late says her phone already has it', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(family.listChanges).mockResolvedValue([change({})]);
  jest
    .mocked(family.cancelChange)
    .mockRejectedValue(
      Object.assign(new Error('ALREADY_TAKEN'), { code: 'ALREADY_TAKEN' }),
    );
  await renderApp('ElderPills', { elderId: 'E' });
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Cancel Change Telma 40' }),
  );
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith("Amma's phone already has it."),
  );
});

test('not an editor sees how to be allowed, and no Add pill', async () => {
  jest
    .mocked(family.getElderSetup)
    .mockResolvedValue({ ...setup, editor: false });
  await renderApp('ElderPills', { elderId: 'E' });
  expect(
    await screen.findByText(
      "Amma's phone hasn't allowed you to change her pills. On her phone: Settings → Family → turn on Can change my pills next to your name.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText('+ Add pill')).toBeNull();
  expect(screen.queryByText('Telma 40')).toBeNull();
});

test('the health warning shows the first problem', async () => {
  jest
    .mocked(family.getElderSetup)
    .mockResolvedValue({ ...setup, problem: 'battery' });
  await renderApp('ElderPills', { elderId: 'E' });
  expect(
    await screen.findByText(
      "Amma's phone may not ring alarms: battery setup not done. On her phone, open PillSaathi and tap the yellow banner.",
    ),
  ).toBeTruthy();
});

test('a pill opens the pill page for her', async () => {
  await renderApp('ElderPills', { elderId: 'E' });
  await fireEvent.press(await screen.findByText('Azee 500'));
  await waitFor(() =>
    expect(headerTitles()).toEqual(["Amma's pills", "Amma's pill"]),
  );
  expect(await screen.findByDisplayValue('Azee 500')).toBeTruthy();
});

test('+ Add pill opens the pill page', async () => {
  await renderApp('ElderPills', { elderId: 'E' });
  await fireEvent.press(await screen.findByText('+ Add pill'));
  await waitFor(() => expect(headerTitles()).toHaveLength(2));
});

test('a time opens the sound picker', async () => {
  await renderApp('ElderPills', { elderId: 'E' });
  await fireEvent.press(await screen.findByText("8:00 AM · Ravi's sound"));
  await waitFor(() => expect(headerTitles()).toHaveLength(2));
});
