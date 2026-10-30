import { StyleSheet } from 'react-native';
import { colors, font, radius, spacing } from '../../theme';

/** What the pill summary's sheets share: their labels, fields, notes and rows of chips. */
export const sheetLook = StyleSheet.create({
  label: {
    ...font(900),
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.blue,
    marginTop: spacing.xs,
  },
  field: {
    ...font(800),
    minHeight: 56,
    borderWidth: 2.5,
    borderColor: colors.blue,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 19,
    color: colors.navy,
    backgroundColor: colors.card,
  },
  invalid: { borderColor: colors.coralText },
  note: { ...font(600), fontSize: 15, lineHeight: 21, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pressed: { opacity: 0.8 },
  // A dashed row to add one more, such as another time.
  addRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 11,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.edge,
    borderRadius: 16,
  },
  addRowText: { ...font(900), fontSize: 16, color: colors.blue, flexShrink: 1 },
  // A rounded word on the blue tint, such as Change.
  small: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.blueTint,
  },
  smallText: { ...font(900), fontSize: 15, color: colors.blueText },
});
