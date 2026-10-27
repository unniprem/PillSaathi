import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  RootNavigator,
  RootStackParamList,
} from '../../src/navigation/RootNavigator';

export function renderApp(
  initialRouteName?: keyof RootStackParamList,
  initialParams?: object,
) {
  return render(
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator
          initialRouteName={initialRouteName}
          initialParams={initialParams}
        />
      </NavigationContainer>
    </SafeAreaProvider>,
  );
}

/** The titles in the native stack's headers, bottom screen first. */
export function headerTitles(): string[] {
  return screen.container
    .queryAll(n => n.type === 'RNSScreenStackHeaderConfig')
    .map(n => n.props.title);
}
