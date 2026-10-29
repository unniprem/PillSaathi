import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PillPicture from '../../src/ui/PillPicture';
import { ICONS } from '../../src/ui/icons';
import { pillColor } from '../../src/ui/pillLook';

test('a pill with a photo shows the photo', async () => {
  await render(
    <PillPicture
      pill={{ name: 'Iron', form: 'tablet', photoUri: 'file:///p.jpg' }}
    />,
  );
  expect(screen.getByTestId('pill-photo').props.source.uri).toBe(
    'file:///p.jpg',
  );
  expect(screen.queryByTestId('pill-shape-tablet')).toBeNull();
});

test('a photo that cannot be read shows the shape instead', async () => {
  await render(
    <PillPicture
      pill={{ name: 'Iron', form: 'tablet', photoUri: 'file:///gone.jpg' }}
    />,
  );
  await fireEvent(screen.getByTestId('pill-photo'), 'error');
  expect(screen.getByTestId('pill-shape-tablet')).toBeTruthy();
  expect(screen.queryByTestId('pill-photo')).toBeNull();
});

test('a tablet without a photo is a round shape in its colour', async () => {
  await render(
    <PillPicture pill={{ name: 'Iron', form: 'tablet', photoUri: null }} />,
  );
  expect(screen.getByTestId('pill-shape-tablet')).toHaveStyle({
    backgroundColor: '#9B3D2E',
  });
});

test('a capsule is drawn in its colour, tilted', async () => {
  await render(
    <PillPicture
      pill={{ name: 'Vitamin D3', form: 'capsule', photoUri: null }}
    />,
  );
  expect(screen.getByTestId('pill-shape-capsule')).toHaveStyle({
    backgroundColor: pillColor('Vitamin D3'),
    transform: [{ rotate: '-45deg' }],
  });
});

test('syrup uses the liquid medicine symbol', async () => {
  await render(
    <PillPicture pill={{ name: 'Cough', form: 'syrup', photoUri: null }} />,
  );
  expect(screen.getByTestId('pill-shape-syrup')).toBeTruthy();
  expect(screen.getByText(ICONS.medication_liquid)).toHaveStyle({
    color: pillColor('Cough'),
  });
});

test('drops use the water drop symbol', async () => {
  await render(
    <PillPicture pill={{ name: 'Eye', form: 'drops', photoUri: null }} />,
  );
  expect(screen.getByTestId('pill-shape-drops')).toBeTruthy();
  expect(screen.getByText(ICONS.water_drop)).toBeTruthy();
});

test('a picture takes the size it is given', async () => {
  await render(
    <PillPicture
      pill={{ name: 'Iron', form: 'tablet', photoUri: 'file:///p.jpg' }}
      size={56}
    />,
  );
  expect(screen.getByTestId('pill-photo')).toHaveStyle({
    width: 56,
    height: 56,
  });
});
