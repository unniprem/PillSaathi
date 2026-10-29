import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  RootNavigator,
  RootStackParamList,
  TAB_ROUTES,
  TabParamList,
} from '../../src/navigation/RootNavigator';

/** Opens the app at [route]: a stack page, or one of the main pages under the tab bar. */
export function renderApp(
  route?: keyof RootStackParamList | keyof TabParamList,
  params?: object,
) {
  const isTab = (TAB_ROUTES as string[]).includes(route ?? '');
  return render(
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator
          initialRouteName={
            isTab ? 'Main' : (route as keyof RootStackParamList | undefined)
          }
          initialParams={isTab ? { screen: route, params } : params}
        />
      </NavigationContainer>
    </SafeAreaProvider>,
  );
}

type Node = { children: (Node | string)[] } | string;

const textOf = (node: Node): string =>
  typeof node === 'string' ? node : node.children.map(textOf).join('');

/** The titles in the pages' sky headers, bottom page first. */
export function headerTitles(): string[] {
  return screen.container
    .queryAll(n => n.props.testID === 'sky-title')
    .map(textOf);
}
