/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { logEnvTest } from './src/utils/envTest';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Test environment variable loading on app start
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('\n🔧 Testing environment variable loading...\n');
    const success = logEnvTest();
    if (success) {
      // eslint-disable-next-line no-console
      console.log('\n✅ Environment variables loaded successfully!\n');
    } else {
       
      console.error('\n❌ Environment variable loading failed!\n');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <NewAppScreen
        templateFileName="App.tsx"
        safeAreaInsets={safeAreaInsets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
