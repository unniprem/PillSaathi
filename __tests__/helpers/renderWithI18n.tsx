import React from 'react';
import { render } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n';

/** [ui] in the app's language, as on a screen. Mock `src/native/alarms` first. */
export function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}
