import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

/**
 * The links the app opens. A family notification about her ("Amma hasn't taken Iron") carries
 * "pillsaathi://elder/<her id>" (FamilyRules.elderLink), which opens her page over Today, so Back
 * comes home. App uses it only when the phone would open on Today anyway, so a link never skips
 * the login.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['pillsaathi://'],
  config: {
    initialRouteName: 'Main',
    screens: { Elder: 'elder/:elderId' },
  },
};
