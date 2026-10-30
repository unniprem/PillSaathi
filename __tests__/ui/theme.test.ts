import { colors, timeTiles } from '../../src/theme';

/** WCAG's contrast ratio between two `#RRGGBB` colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b2] = [1, 3, 5]
      .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// Words need 4.5:1 on what they sit on; a mark that carries meaning without words (a ring, a
// bar, a switch's track, a symbol on a tile) needs 3:1.
test.each([
  ['navy', colors.navy],
  ['muted', colors.muted],
  ['blue', colors.blue],
  ['greenText', colors.greenText],
  ['coralText', colors.coralText],
  ['amberText', colors.amberText],
])('%s words read on the page and on a card', (_, ink) => {
  expect(contrast(ink, colors.page)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(ink, colors.card)).toBeGreaterThanOrEqual(4.5);
});

test('words on the tints, and white on the blue button', () => {
  expect(contrast(colors.blueText, colors.blueTint)).toBeGreaterThanOrEqual(
    4.5,
  );
  expect(contrast(colors.greenText, colors.greenTint)).toBeGreaterThanOrEqual(
    4.5,
  );
  expect(contrast(colors.coralText, colors.coralTint)).toBeGreaterThanOrEqual(
    4.5,
  );
  expect(contrast(colors.amberText, colors.amberTint)).toBeGreaterThanOrEqual(
    4.5,
  );
  expect(contrast(colors.onFill, colors.blue)).toBeGreaterThanOrEqual(4.5);
});

test("a switch's off track shows on a white card", () => {
  expect(contrast(colors.switchOff, colors.card)).toBeGreaterThanOrEqual(3);
});

test('the amber ring and bar show on white and on the amber tint', () => {
  expect(contrast(colors.amber, colors.card)).toBeGreaterThanOrEqual(3);
  expect(contrast(colors.amber, colors.amberTint)).toBeGreaterThanOrEqual(3);
});

test.each(Object.entries(timeTiles))(
  "the %s tile's symbol shows on its tile",
  (_, tile) => {
    expect(contrast(tile.ink, tile.fill)).toBeGreaterThanOrEqual(3);
  },
);
