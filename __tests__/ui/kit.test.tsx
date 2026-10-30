import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import SkyBand from '../../src/ui/SkyBand';
import SkyTop from '../../src/ui/SkyTop';
import Button from '../../src/ui/Button';
import Chip from '../../src/ui/Chip';
import Stepper from '../../src/ui/Stepper';
import Sheet from '../../src/ui/Sheet';
import DoseBars from '../../src/ui/DoseBars';
import TabBar from '../../src/ui/TabBar';
import SectionLabel from '../../src/ui/SectionLabel';
import AddRow from '../../src/ui/AddRow';
import CallButton from '../../src/ui/CallButton';
import { ICONS } from '../../src/ui/icons';
import { SKY_GRADIENT } from '../../src/ui/sky';
import { colors, shadow } from '../../src/theme';
import { renderWithI18n } from '../helpers/renderWithI18n';

jest.mock('../../src/native/alarms');

// React Native quietly drops a shadow or gradient it can't parse, so parse them as it will.
const { default: processBoxShadow } = jest.requireActual(
  'react-native/Libraries/StyleSheet/processBoxShadow',
);
const { default: processBackgroundImage } = jest.requireActual(
  'react-native/Libraries/StyleSheet/processBackgroundImage',
);

test('the sky band shows its title and goes back', async () => {
  const onBack = jest.fn();
  await renderWithI18n(<SkyBand title="Iron" onBack={onBack} />);
  expect(screen.getByTestId('sky-title')).toHaveTextContent('Iron');
  await fireEvent.press(screen.getByLabelText('Back'));
  expect(onBack).toHaveBeenCalled();
});

test('the sky band can close instead', async () => {
  const onClose = jest.fn();
  await renderWithI18n(<SkyBand title="My family code" onClose={onClose} />);
  expect(screen.queryByLabelText('Back')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Close'));
  expect(onClose).toHaveBeenCalled();
});

test('the sky band shows step progress', async () => {
  await renderWithI18n(
    <SkyBand title="Add a pill" progress={{ step: 3, total: 5 }} />,
  );
  expect(screen.getByText('3 of 5')).toBeTruthy();
});

test('with no title the step bar takes its place', async () => {
  await renderWithI18n(
    <SkyBand title="" onClose={() => {}} progress={{ step: 1, total: 5 }} />,
  );
  expect(screen.queryByTestId('sky-title')).toBeNull();
  expect(screen.getByText('1 of 5')).toBeTruthy();
});

test('the sky band holds what sits on the sky under its row', async () => {
  await renderWithI18n(
    <SkyBand title="" onBack={() => {}}>
      <Text>Iron</Text>
    </SkyBand>,
  );
  expect(screen.queryByTestId('sky-title')).toBeNull();
  expect(screen.getByTestId('sky-band')).toHaveTextContent(/Iron/);
});

test('the sky band follows the clock, with white words at night', async () => {
  await renderWithI18n(<SkyBand title="Iron" hour={21} />);
  const { backgroundImage } = StyleSheet.flatten(
    screen.getByTestId('sky-band').props.style,
  );
  expect(backgroundImage).toContain(SKY_GRADIENT.night[0]);
  expect(processBackgroundImage(backgroundImage)).toHaveLength(1);
  expect(screen.getByTestId('sky-title')).toHaveStyle({
    color: colors.onFill,
  });
});

test('the tall sky draws a sun by day and a moon at night', async () => {
  const { rerender } = await render(
    <SkyTop hour={14} title="Good afternoon" sub="Thursday, 29 October">
      <Text>1 of 3 done</Text>
    </SkyTop>,
  );
  expect(screen.getByTestId('sky-title')).toHaveTextContent('Good afternoon');
  expect(screen.getByText('Thursday, 29 October')).toBeTruthy();
  expect(screen.getByText('1 of 3 done')).toBeTruthy();
  expect(screen.getByTestId('sky-sun')).toBeTruthy();
  expect(screen.queryByTestId('sky-moon')).toBeNull();

  await rerender(<SkyTop hour={21} title="Good evening" />);
  expect(screen.getByTestId('sky-moon')).toBeTruthy();
  expect(screen.queryByTestId('sky-sun')).toBeNull();
});

test('a disabled button says so and does nothing', async () => {
  const onPress = jest.fn();
  await render(<Button label="Next" onPress={onPress} disabled />);
  const next = screen.getByRole('button', { name: 'Next' });
  expect(next).toBeDisabled();
  await fireEvent.press(next);
  expect(onPress).not.toHaveBeenCalled();
});

test('a button can carry an icon beside its words', async () => {
  const onPress = jest.fn();
  await render(
    <Button label="Save" icon="check" variant="green" onPress={onPress} />,
  );
  expect(screen.getByText(ICONS.check)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(onPress).toHaveBeenCalled();
});

test('a closed sheet shows nothing', async () => {
  await renderWithI18n(
    <Sheet visible={false} onClose={() => {}}>
      <Text>Inside</Text>
    </Sheet>,
  );
  expect(screen.queryByText('Inside')).toBeNull();
});

test('an open sheet closes from its backdrop', async () => {
  const onClose = jest.fn();
  await renderWithI18n(
    <Sheet visible onClose={onClose} title="Rings at">
      <Text>Inside</Text>
    </Sheet>,
  );
  expect(screen.getByText('Inside')).toBeTruthy();
  expect(screen.getByText('Rings at')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('sheet-backdrop'));
  expect(onClose).toHaveBeenCalled();
});

test('a chosen chip says so', async () => {
  await render(
    <>
      <Chip label="5 days" on onPress={() => {}} />
      <Chip label="10 days" on={false} onPress={() => {}} />
    </>,
  );
  expect(screen.getByRole('button', { name: '5 days' })).toBeSelected();
  expect(screen.getByRole('button', { name: '10 days' })).not.toBeSelected();
});

test('the stepper steps both ways, but not past its end', async () => {
  const onLess = jest.fn();
  const onMore = jest.fn();
  await render(
    <Stepper
      value="½"
      sub="tablet"
      onLess={onLess}
      onMore={onMore}
      lessLabel="Less"
      moreLabel="More"
      lessDisabled
    />,
  );
  expect(screen.getByText('½')).toBeTruthy();
  expect(screen.getByText('tablet')).toBeTruthy();
  expect(screen.getByLabelText('Less')).toBeDisabled();
  await fireEvent.press(screen.getByLabelText('Less'));
  await fireEvent.press(screen.getByLabelText('More'));
  expect(onLess).not.toHaveBeenCalled();
  expect(onMore).toHaveBeenCalledTimes(1);
});

test('dose bars draw one bar per dose', async () => {
  await render(<DoseBars taken={1} missed={1} rest={1} />);
  const bars = screen.getAllByTestId('dose-bar');
  expect(bars).toHaveLength(3);
  expect(bars[0]).toHaveStyle({ backgroundColor: colors.green });
  expect(bars[1]).toHaveStyle({ backgroundColor: colors.coral });
});

// A dose her phone hasn't reported is not one still to come, and must show on a white card.
test('dose bars draw a dose not reported in amber, apart from the rest', async () => {
  await render(
    <DoseBars taken={1} missed={0} notReported={2} rest={1} onCard />,
  );
  const bars = screen.getAllByTestId('dose-bar');
  expect(bars).toHaveLength(4);
  expect(bars[1]).toHaveStyle({ backgroundColor: colors.amber });
  expect(bars[2]).toHaveStyle({ backgroundColor: colors.amber });
  expect(bars[3]).toHaveStyle({ backgroundColor: colors.line });
});

test('a section label is a small blue heading', async () => {
  await render(<SectionLabel>Who can see my pills</SectionLabel>);
  const label = screen.getByRole('header', { name: 'Who can see my pills' });
  expect(label).toHaveStyle({
    color: colors.blue,
    textTransform: 'uppercase',
  });
});

test('an add row is a button with a plus before its words', async () => {
  const onPress = jest.fn();
  await render(<AddRow label="Add family" onPress={onPress} />);
  expect(screen.getByText(ICONS.add)).toBeTruthy();
  // Named by its words alone, without the plus's glyph.
  await fireEvent.press(screen.getByRole('button', { name: 'Add family' }));
  expect(onPress).toHaveBeenCalled();
});

test('Call dials the number, and is named Call', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await renderWithI18n(<CallButton phone="+919800000000" size={52} />);
  const call = screen.getByRole('button', { name: 'Call' });
  expect(call).toHaveStyle({ width: 52, height: 52 });
  expect(StyleSheet.flatten(call.props.style).backgroundColor).toBe(
    colors.green,
  );
  await fireEvent.press(call);
  expect(open).toHaveBeenCalledWith('tel:+919800000000');
  open.mockRestore();
});

/** A tab bar's props as the tab navigator passes them, on [index]. */
function tabBarProps(index: number) {
  const routes = ['Today', 'History', 'Family', 'Settings'].map(name => ({
    key: `${name}-1`,
    name,
  }));
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  };
  const props = {
    state: {
      key: 'tabs-1',
      index,
      routeNames: routes.map(r => r.name),
      routes,
      history: [],
      type: 'tab',
      stale: false,
      preloadedRouteKeys: [],
    },
    descriptors: {},
    navigation,
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  } as unknown as BottomTabBarProps;
  return { props, navigation };
}

test('the tab bar marks the current tab and opens another', async () => {
  const { props, navigation } = tabBarProps(3);
  await renderWithI18n(<TabBar {...props} />);
  expect(screen.getByRole('tab', { name: 'Settings' })).toBeSelected();
  expect(screen.getByRole('tab', { name: 'Today' })).not.toBeSelected();
  expect(screen.getByText(ICONS.settings)).toHaveStyle({
    fontFamily: 'Symbols',
  });
  expect(screen.getByText(ICONS.home)).toHaveStyle({
    fontFamily: 'SymbolsOutlined',
  });

  await fireEvent.press(screen.getByRole('tab', { name: 'History' }));
  expect(navigation.navigate).toHaveBeenCalledWith('History', undefined);
  // The open tab stays put.
  await fireEvent.press(screen.getByRole('tab', { name: 'Settings' }));
  expect(navigation.navigate).toHaveBeenCalledTimes(1);
});

test("the theme's shadows are ones React Native can draw", () => {
  for (const value of Object.values(shadow)) {
    expect(processBoxShadow(value)).toHaveLength(1);
  }
});
