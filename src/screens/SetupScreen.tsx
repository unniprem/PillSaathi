import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  getHealth,
  getSetupState,
  openSetting,
  setSetupStepDone,
} from '../native/alarms';
import type { Health, SetupState } from '../native/alarms';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { currentManufacturer, stepsFor } from '../setup/oemSteps';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Setup'>;

export default function SetupScreen({ navigation }: Props) {
  const [health, setHealth] = useState<Health | null>(null);
  const [setup, setSetup] = useState<SetupState | null>(null);
  const mounted = useRef(true);
  const steps = stepsFor(currentManufacturer());

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Re-read on focus so returning from Settings updates the ticks.
  useFocusEffect(
    useCallback(() => {
      getHealth()
        .then(h => mounted.current && setHealth(h))
        .catch(e => console.warn('Could not read health', e));
      getSetupState()
        .then(s => mounted.current && setSetup(s))
        .catch(e => console.warn('Could not read setup state', e));
    }, []),
  );

  const isDone = (key: string) => setup?.doneSteps.includes(key) ?? false;

  const toggle = async (key: string) => {
    const done = !isDone(key);
    try {
      await setSetupStepDone(key, done);
      if (mounted.current) {
        setSetup(s => {
          const rest = (s?.doneSteps ?? []).filter(k => k !== key);
          return {
            seen: s?.seen ?? true,
            doneSteps: done ? [...rest, key] : rest,
          };
        });
      }
    } catch (e) {
      console.warn('Could not save the step', e);
    }
  };

  const open = (setting: NonNullable<(typeof steps)[number]['setting']>) =>
    openSetting(setting).catch(e => console.warn('Could not open settings', e));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Some phones stop apps in the background. Do these steps once so your
          alarms always ring.
        </Text>
        {steps.map(step => (
          <View key={step.key} style={styles.card}>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>
            <View style={styles.buttons}>
              {step.setting ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => open(step.setting!)}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Open settings</Text>
                </Pressable>
              ) : null}
              {step.autoDone ? (
                health?.ignoringBatteryOptimizations ? (
                  <Text style={styles.auto}>✓ Allowed</Text>
                ) : null
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => toggle(step.key)}
                  style={[styles.button, isDone(step.key) && styles.buttonOn]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isDone(step.key) && styles.buttonTextOn,
                    ]}
                  >
                    {isDone(step.key) ? 'Done ✓' : 'Done'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.goBack()}
        style={styles.finish}
      >
        <Text style={styles.finishText}>Finish</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  intro: { fontSize: 18, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, color: colors.textMuted },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  buttonOn: { backgroundColor: colors.primary },
  buttonText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  buttonTextOn: { color: colors.onPrimary },
  auto: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  finish: {
    margin: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  finishText: { color: colors.onPrimary, fontSize: 18, fontWeight: '700' },
});
