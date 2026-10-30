import React from 'react';
import { StyleSheet } from 'react-native';
import { screen } from '@testing-library/react-native';
import PersonCard from '../../src/components/today/PersonCard';
import type { FamilyCard } from '../../src/native/family';
import { colors } from '../../src/theme';
import { mockAlarmsDefaults } from '../helpers/nativeMocks';
import { renderWithI18n } from '../helpers/renderWithI18n';

jest.mock('../../src/native/alarms');

const amma: FamilyCard = {
  elderId: 'E',
  name: 'Amma',
  phone: null,
  delayMinutes: 30,
  heardAt: new Date(2026, 9, 28, 13, 12).getTime(),
  silent: false,
  abandoned: false,
  otherZone: false,
  tally: { taken: 1, skipped: 0, missed: 1, notReported: 2, later: 1 },
  refills: [],
};

const show = (card: FamilyCard) =>
  renderWithI18n(
    <PersonCard card={card} problem={null} is24h={false} onOpen={() => {}} />,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Not reported is not the same as still to come, and must show on the white card.
test('doses not reported are amber bars, apart from those still to come', async () => {
  await show(amma);
  expect(
    screen.getByText('1 taken · 1 missed · 2 not reported · 1 later'),
  ).toBeTruthy();
  const bars = screen
    .getAllByTestId('dose-bar')
    .map(bar => StyleSheet.flatten(bar.props.style).backgroundColor);
  expect(bars).toEqual([
    colors.green,
    colors.coral,
    colors.amber,
    colors.amber,
    colors.line,
  ]);
});

test('two pills of the same name running low are both shown', async () => {
  const error = jest.spyOn(console, 'error');
  const iron = {
    pillId: 'p1',
    name: 'Iron',
    form: 'tablet' as const,
    remaining: 0,
    daysLeft: 0,
    level: 'out' as const,
  };
  await show({ ...amma, refills: [iron, { ...iron, pillId: 'p2' }] });
  expect(screen.getAllByText('Iron: none left')).toHaveLength(2);
  const said = error.mock.calls.map(args => args.join(' '));
  expect(said.filter(line => line.includes('same key'))).toEqual([]);
});
