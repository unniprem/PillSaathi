import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as family from '../../src/native/family';
import * as sounds from '../../src/native/sounds';
import { mockAlarmsDefaults, mockFamilyDefaults } from '../helpers/nativeMocks';
import { headerTitles, renderApp } from '../helpers/renderApp';

jest.mock('../../src/native/alarms');
jest.mock('../../src/native/sounds');

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
  mockFamilyDefaults();
  jest.mocked(sounds.listSounds).mockResolvedValue([]);
});

test('the tab bar opens each main page', async () => {
  await renderApp('Today');
  await fireEvent.press(await screen.findByRole('tab', { name: 'Settings' }));
  expect(headerTitles()).toContain('Settings');
  await fireEvent.press(screen.getByRole('tab', { name: 'History' }));
  expect(headerTitles()).toContain('History');
  await fireEvent.press(screen.getByRole('tab', { name: 'Family' }));
  expect(headerTitles()).toContain('Family');
});

test("a page opened from a tab goes back to it from its sky band's Close", async () => {
  jest.mocked(family.createLinkCode).mockResolvedValue({
    code: '482913',
    expiresAt: Date.now() + 15 * 60_000,
    qrUri: 'file:///cache/family/qr-482913.png',
  });
  await renderApp('Family');
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Show my code' }),
  );
  await waitFor(() =>
    expect(headerTitles()).toEqual(['Family', 'My family code']),
  );
  await fireEvent.press(screen.getAllByLabelText('Close').at(-1)!);
  await waitFor(() => expect(headerTitles()).toEqual(['Family']));
});
