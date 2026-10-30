import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getHealth,
  getSetupState,
  markSetupSeen,
  openSetting,
  setSetupStepDone,
} from '../native/alarms';
import type { Health, SettingTarget, SetupState } from '../native/alarms';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useI18n } from '../i18n';
import {
  autoChecked,
  currentManufacturer,
  makerName,
  setupProgress,
  stepDone,
  stepsFor,
} from '../setup/oemSteps';
import type { SetupStep } from '../setup/oemSteps';
import { colors, font, radius, shadow, spacing } from '../theme';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import SkyBand from '../ui/SkyBand';

type Props = NativeStackScreenProps<RootStackParamList, 'Setup'>;

/**
 * The steps that stop this phone from stopping alarms, one at a time: done steps are ticked, the
 * first one not done is open with its buttons, and later ones wait, faded. Shown once after the
 * login (`firstRun`, with no page behind it), and from Settings.
 */
export default function SetupScreen({ navigation, route }: Props) {
  const firstRun = route.params?.firstRun ?? false;
  const [health, setHealth] = useState<Health | null>(null);
  const [setup, setSetup] = useState<SetupState | null>(null);
  // Nothing is open until both reads settle, so the open step doesn't jump.
  const [loaded, setLoaded] = useState(false);
  // A step she tapped, open in place of the current one until she ticks it.
  const [chosen, setChosen] = useState<string | null>(null);
  const mounted = useRef(true);
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const manufacturer = currentManufacturer();
  const steps = stepsFor(manufacturer, t);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Seen once here, so the first pill she saves doesn't open setup again.
  useEffect(() => {
    if (firstRun) {
      markSetupSeen().catch(e => console.warn('Could not mark setup seen', e));
    }
  }, [firstRun]);

  const load = useCallback(() => {
    Promise.allSettled([getHealth(), getSetupState()]).then(([h, s]) => {
      if (!mounted.current) {
        return;
      }
      if (h.status === 'fulfilled') {
        setHealth(h.value);
      } else {
        console.warn('Could not read health', h.reason);
      }
      if (s.status === 'fulfilled') {
        setSetup(s.value);
      } else {
        console.warn('Could not read setup state', s.reason);
      }
      setLoaded(true);
    });
  }, []);

  // Read again on focus, and when she comes back from the phone's settings, so a step the
  // phone checks ticks itself.
  useFocusEffect(load);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        load();
      }
    });
    return () => sub.remove();
  }, [load]);

  const doneSteps = setup?.doneSteps ?? [];
  const autoDone = autoChecked(health);
  const isDone = (step: SetupStep) => stepDone(step, doneSteps, autoDone);
  const progress = setupProgress(steps, doneSteps, autoDone);
  // A tapped step the phone has since ticked has nothing left to do: the current one opens.
  const tapped = steps.find(
    s => s.key === chosen && !(s.autoDone && isDone(s)),
  );
  const openKey = tapped?.key ?? progress.current;

  const toggle = async (step: SetupStep) => {
    const done = !isDone(step);
    try {
      await setSetupStepDone(step.key, done);
      if (mounted.current) {
        setSetup(s => {
          const rest = (s?.doneSteps ?? []).filter(k => k !== step.key);
          return {
            seen: s?.seen ?? true,
            doneSteps: done ? [...rest, step.key] : rest,
          };
        });
        // Ticked, the next step not done opens; unticked, it stays open to tick again.
        setChosen(done ? null : step.key);
      }
    } catch (e) {
      console.warn('Could not save the step', e);
    }
  };

  // The first time there is no page behind: she goes on to Today.
  const leave = () => {
    if (firstRun) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } else {
      navigation.goBack();
    }
  };

  // Opening the settings never ticks a step: only she, or the phone's own check, can.
  const openSettings = (setting: SettingTarget) =>
    openSetting(setting).catch(e => console.warn('Could not open settings', e));

  const allDone = progress.current === null;

  return (
    <View style={styles.page}>
      <SkyBand
        title={firstRun ? t.setup.firstTitle : t.setup.title}
        onBack={firstRun ? undefined : () => navigation.goBack()}
        progress={
          loaded
            ? {
                step: progress.done,
                total: progress.total,
                label: t.setup.progress(
                  progress.done,
                  progress.total,
                  makerName(manufacturer),
                ),
              }
            : undefined
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <Text style={styles.intro}>{t.setup.intro}</Text>
        {loaded ? (
          <>
            {steps.map((step, i) => (
              <Step
                key={step.key}
                number={i + 1}
                step={step}
                done={isDone(step)}
                open={step.key === openKey}
                onOpen={() => setChosen(step.key)}
              >
                {step.setting ? (
                  <Button
                    label={t.common.openSettings}
                    onPress={() => openSettings(step.setting!)}
                  />
                ) : null}
                {step.autoDone ? null : (
                  <Button
                    label={isDone(step) ? t.setup.doneTick : t.setup.done}
                    variant={isDone(step) ? 'green' : 'secondary'}
                    onPress={() => toggle(step)}
                  />
                )}
              </Step>
            ))}
            {firstRun && !allDone ? (
              <Pressable
                accessibilityRole="button"
                onPress={leave}
                style={({ pressed }) => [
                  styles.later,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.laterText}>{t.setup.later}</Text>
              </Pressable>
            ) : (
              <View style={styles.finish}>
                <Button
                  label={t.setup.finish}
                  variant={allDone ? 'primary' : 'secondary'}
                  onPress={leave}
                />
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

type StepProps = {
  number: number;
  step: SetupStep;
  done: boolean;
  open: boolean;
  onOpen: () => void;
  /** The open step's buttons. */
  children: ReactNode;
};

/**
 * One step as a card: a tick or its number, then its title. Open, it adds its words and buttons.
 * Closed, a tap opens it, except a step the phone has ticked itself, which has nothing to do.
 */
function Step({ number, step, done, open, onOpen, children }: StepProps) {
  const { t } = useI18n();
  const later = !done && !open;
  const body = (
    <>
      <View
        style={[
          styles.badge,
          done ? styles.badgeDone : open && styles.badgeOpen,
        ]}
      >
        {done ? (
          <Icon
            name="check"
            size={20}
            color={colors.onFill}
            accessibilityLabel={t.setup.ticked}
          />
        ) : (
          <Text style={[styles.number, open && styles.numberOpen]}>
            {number}
          </Text>
        )}
      </View>
      <View style={styles.words}>
        <View style={styles.head}>
          <Text style={[styles.title, done && !open && styles.titleDone]}>
            {step.title}
          </Text>
          {done && step.autoDone ? (
            <Text style={styles.allowed}>{t.setup.allowed}</Text>
          ) : null}
        </View>
        {open ? (
          <>
            <Text style={styles.text}>{step.body}</Text>
            <View style={styles.buttons}>{children}</View>
          </>
        ) : null}
      </View>
    </>
  );
  const look = [
    styles.step,
    later ? styles.stepLater : styles.raised,
    open && styles.stepOpen,
  ];
  if (open || (done && step.autoDone)) {
    return (
      <View testID={`setup-step-${step.key}`} style={look}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={`setup-step-${step.key}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [look, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  content: { padding: spacing.md, gap: 12 },
  intro: { ...font(600), fontSize: 16, lineHeight: 22, color: colors.muted },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    // Kept clear when closed, so opening a step doesn't shift its words.
    borderWidth: 2.5,
    borderColor: 'transparent',
    backgroundColor: colors.card,
  },
  // Later steps lie flat.
  raised: { boxShadow: shadow.card },
  stepOpen: { borderColor: colors.blue },
  stepLater: { opacity: 0.55 },
  pressed: { opacity: 0.7 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.soft,
  },
  badgeDone: { backgroundColor: colors.green },
  badgeOpen: { backgroundColor: colors.blue },
  number: { ...font(900), fontSize: 16, color: colors.muted },
  numberOpen: { color: colors.onFill },
  words: { flex: 1, paddingTop: 5 },
  // The tag moves under a title too long to share its line.
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
    rowGap: 4,
  },
  title: { ...font(900), fontSize: 18, color: colors.navy, flexShrink: 1 },
  titleDone: { color: colors.muted },
  allowed: {
    ...font(800),
    fontSize: 14,
    color: colors.greenText,
    backgroundColor: colors.greenTint,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  text: {
    ...font(600),
    fontSize: 16,
    lineHeight: 23,
    color: colors.muted,
    marginTop: 6,
  },
  buttons: { gap: spacing.sm, marginTop: 12 },
  later: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  laterText: { ...font(800), fontSize: 17, color: colors.blue },
  finish: { marginTop: spacing.sm },
});
