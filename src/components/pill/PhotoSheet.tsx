import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useI18n } from '../../i18n';
import { colors, font } from '../../theme';
import Button from '../../ui/Button';
import Sheet from '../../ui/Sheet';
import { sheetLook } from './sheetLook';

type Props = {
  visible: boolean;
  /** The pill has a photo, which can be removed. */
  hasPhoto: boolean;
  onClose: () => void;
  onPick: (source: 'camera' | 'gallery') => void;
  onRemove: () => void;
};

/** A new photo of the pill's strip, from the camera or the gallery, or none. */
export default function PhotoSheet({
  visible,
  hasPhoto,
  onClose,
  onPick,
  onRemove,
}: Props) {
  const { t } = useI18n();
  const { fontScale } = useWindowDimensions();
  return (
    <Sheet visible={visible} onClose={onClose} title={t.pill.photo}>
      <Text style={[sheetLook.note, styles.center]}>{t.addPill.photoNote}</Text>
      {/* Side by side, or one under the other once large text needs the room. */}
      <View style={styles.pair}>
        <View style={[styles.half, { flexBasis: 140 * fontScale }]}>
          <Button
            label={t.addPill.camera}
            icon="photo_camera"
            variant="secondary"
            onPress={() => onPick('camera')}
          />
        </View>
        <View style={[styles.half, { flexBasis: 140 * fontScale }]}>
          <Button
            label={t.addPill.gallery}
            icon="image"
            variant="secondary"
            onPress={() => onPick('gallery')}
          />
        </View>
      </View>
      {hasPhoto ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRemove}
          style={({ pressed }) => [styles.remove, pressed && sheetLook.pressed]}
        >
          <Text style={styles.removeText}>{t.pill.removePhoto}</Text>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  half: { flexGrow: 1 },
  remove: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  removeText: { ...font(900), fontSize: 16, color: colors.coralText },
});
