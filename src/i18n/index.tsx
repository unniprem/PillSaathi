import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { currentLanguage, setLanguage as saveLanguage } from '../native/alarms';
import { en } from './en';
import type { Strings } from './en';
import { hi } from './hi';
import { ml } from './ml';

/** The app's languages, as the native side names them. */
export type Lang = 'en' | 'ml' | 'hi';
export type { Strings };

const TABLES: Record<Lang, Strings> = { en, ml, hi };

/** Each language's name as its own readers write it, the same as the native side's. */
export const LANGUAGE_LABELS: Record<Lang, string> = {
  en: 'English',
  ml: 'മലയാളം',
  hi: 'हिन्दी',
};

export function isLang(code: unknown): code is Lang {
  return code === 'en' || code === 'ml' || code === 'hi';
}

export function stringsFor(lang: Lang): Strings {
  return TABLES[lang];
}

/**
 * The language native speaks now, read synchronously so the first screen is already in it. Any
 * code this app doesn't know, or a failure, is English, as on the ringing screen.
 */
function startingLanguage(): Lang {
  try {
    const code = currentLanguage();
    return isLang(code) ? code : 'en';
  } catch (e) {
    console.warn('Could not read the app language', e);
    return 'en';
  }
}

type I18n = {
  lang: Lang;
  t: Strings;
  /** Saves the language natively first (the next ring uses it), then redraws in it. */
  setLanguage: (lang: Lang) => Promise<void>;
};

const I18nContext = createContext<I18n>({
  lang: 'en',
  t: en,
  setLanguage: async () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(startingLanguage);
  // A phone-language change (or one made while the app was away) reaches the next ring at once;
  // read it again on coming back, so the app never speaks another language than the ring.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setLang(startingLanguage());
      }
    });
    return () => sub.remove();
  }, []);
  const setLanguage = useCallback(async (next: Lang) => {
    await saveLanguage(next);
    setLang(next);
  }, []);
  const value = useMemo(
    () => ({ lang, t: TABLES[lang], setLanguage }),
    [lang, setLanguage],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** The app's language and its words. English outside an [I18nProvider]. */
export function useI18n(): I18n {
  return useContext(I18nContext);
}
