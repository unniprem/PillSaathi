import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useCheckIn } from './src/hooks/useCheckIn';
import { startRoute } from './src/lib/start';
import type { StartRoute } from './src/lib/start';
import { getSettings } from './src/native/alarms';
import { signedInRelative } from './src/native/family';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

/**
 * Who the phone is for and its Google login, each null when it can't be read, so a phone that
 * can't tell still reaches the login page and, through it, Today.
 */
async function whereToStart(): Promise<StartRoute> {
  const [role, account] = await Promise.all([
    getSettings().then(
      s => s.role,
      e => {
        console.warn('Could not read the settings', e);
        return null;
      },
    ),
    signedInRelative().catch(e => {
      console.warn('Could not read the login', e);
      return null;
    }),
  ]);
  return startRoute({ role, account });
}

function App() {
  useCheckIn();
  const [start, setStart] = useState<StartRoute | null>(null);

  useEffect(() => {
    let live = true;
    whereToStart().then(route => live && setStart(route));
    return () => {
      live = false;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {start ? (
        <NavigationContainer>
          <RootNavigator
            initialRouteName={start.name}
            initialParams={start.name === 'Login' ? start.params : undefined}
          />
        </NavigationContainer>
      ) : (
        <View style={styles.wait} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  wait: { flex: 1, backgroundColor: colors.page },
});

export default App;
