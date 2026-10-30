import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Avatar from '../../src/ui/Avatar';
import { ICONS } from '../../src/ui/icons';
import { nameIndex } from '../../src/ui/pillLook';
import { AVATAR_COLORS } from '../../src/theme';

test('an avatar shows the first letter', async () => {
  await render(<Avatar name="amma" />);
  expect(screen.getByText('A')).toBeTruthy();
});

test('an avatar takes its colours from the name', async () => {
  await render(<Avatar name="Ravi" />);
  const [, to] = AVATAR_COLORS[nameIndex('Ravi', 6)];
  expect(screen.getByTestId('avatar')).toHaveStyle({
    width: 46,
    backgroundColor: to,
  });
});

test('an avatar can show an icon instead of the letter', async () => {
  await render(<Avatar name="Amma" icon="question_mark" size={72} />);
  expect(screen.getByText(ICONS.question_mark)).toBeTruthy();
  expect(screen.queryByText('A')).toBeNull();
  expect(screen.getByTestId('avatar')).toHaveStyle({ width: 72 });
});

test('a Malayalam name shows its first letter', async () => {
  await render(<Avatar name=" അമ്മ" />);
  expect(screen.getByText('അ')).toBeTruthy();
});
