import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import AllowDialog from '../../src/components/AllowDialog';
import { mockAlarmsDefaults } from '../helpers/nativeMocks';
import { renderWithI18n } from '../helpers/renderWithI18n';

jest.mock('../../src/native/alarms');

const ravi = { uid: 'R', name: 'Ravi', email: 'ravi@gmail.com' };

beforeEach(() => {
  jest.clearAllMocks();
  mockAlarmsDefaults();
});

test('the Allow dialog says what she agrees to, and Allow answers yes', async () => {
  const onAnswer = jest.fn();
  await renderWithI18n(<AllowDialog person={ravi} onAnswer={onAnswer} />);
  expect(screen.getByText('Let Ravi see and change your pills?')).toBeTruthy();
  expect(screen.getByText('ravi@gmail.com')).toBeTruthy();
  expect(
    screen.getByText('Ravi sees your pills and whether you took them'),
  ).toBeTruthy();
  expect(
    screen.getByText('Ravi can add or change pills and sounds'),
  ).toBeTruthy();
  expect(screen.getByText('You get a notice each time Ravi does')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Allow' }));
  expect(onAnswer).toHaveBeenCalledWith(true);
});

test('No answers no', async () => {
  const onAnswer = jest.fn();
  await renderWithI18n(<AllowDialog person={ravi} onAnswer={onAnswer} />);
  await fireEvent.press(screen.getByRole('button', { name: 'No' }));
  expect(onAnswer).toHaveBeenCalledWith(false);
  expect(onAnswer).toHaveBeenCalledTimes(1);
});

test('with no one asking, nothing shows', async () => {
  await renderWithI18n(<AllowDialog person={null} onAnswer={() => {}} />);
  expect(screen.queryByText('Let Ravi see and change your pills?')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Allow' })).toBeNull();
});
