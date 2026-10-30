import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Icon from '../../src/ui/Icon';
import { ICONS } from '../../src/ui/icons';

test('an icon is its code point in the Symbols font', async () => {
  await render(<Icon name="home" />);
  expect(screen.getByText(ICONS.home)).toHaveStyle({ fontFamily: 'Symbols' });
});

test('outlined icons use the outlined font', async () => {
  await render(<Icon name="home" outlined />);
  expect(screen.getByText(ICONS.home)).toHaveStyle({
    fontFamily: 'SymbolsOutlined',
  });
});

test('a labelled icon can be found by its label', async () => {
  await render(<Icon name="calendar_month" accessibilityLabel="History" />);
  expect(screen.getByLabelText('History')).toHaveTextContent(
    ICONS.calendar_month,
  );
});

test('an icon keeps its size at any text size', async () => {
  await render(<Icon name="call" size={30} />);
  const icon = screen.getByText(ICONS.call);
  expect(icon).toHaveStyle({ fontSize: 30 });
  expect(icon.props.allowFontScaling).toBe(false);
});

test('every icon is one private-use code point', () => {
  Object.values(ICONS).forEach(c => {
    expect([...c]).toHaveLength(1);
    expect(c.codePointAt(0)!).toBeGreaterThanOrEqual(0xe000);
  });
});
