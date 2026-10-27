import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { FORM_ICONS } from '../lib/amount';
import type { TodayPill } from '../native/alarms';
import { spacing } from '../theme';

type Props = { pill: Pick<TodayPill, 'pillId' | 'form' | 'photoUri'> };

/** The pill's photo, or its type's icon when it has none or the photo can't be read. */
export default function PillPicture({ pill }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={styles.picture}>
      {pill.photoUri && !failed ? (
        <Image
          testID={`pill-photo-${pill.pillId}`}
          source={{ uri: pill.photoUri }}
          onError={() => setFailed(true)}
          style={styles.photo}
        />
      ) : (
        <Text testID={`pill-icon-${pill.pillId}`} style={styles.icon}>
          {FORM_ICONS[pill.form]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  picture: {
    width: 40,
    height: 40,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: 40, height: 40, borderRadius: 8 },
  icon: { fontSize: 26 },
});
