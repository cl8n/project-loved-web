import type { PropsWithChildren } from 'react';
import { createContext, useMemo, useState } from 'react';
import type { MessageFormatElement } from 'react-intl';
import { IntlProvider } from 'react-intl';
import { useRequiredContext } from './react-helpers';

type IntlContextValue = [string, (locale: string) => void];

const intlContext = createContext<IntlContextValue | undefined>(undefined);

function loadMessages(locale: string): Record<string, MessageFormatElement[]> {
  try {
    return require(`./compiled-translations/${locale}.json`);
  } catch {
    return {};
  }
}

export const locales = [
  { code: 'en', name: 'English' },
  // { code: 'ar', name: 'اَلْعَرَبِيَّةُ‎' },
  // { code: 'be', name: 'беларуская мова' },
  { code: 'bg', name: 'български' },
  // { code: 'ca', name: 'català' },
  // { code: 'cs', name: 'česky' },
  // { code: 'da', name: 'dansk' },
  { code: 'de', name: 'Deutsch' },
  // { code: 'el', name: 'ελληνικά' },
  { code: 'es', name: 'español' },
  { code: 'fi', name: 'suomi' },
  // { code: 'fil', name: 'wikang Filipino' },
  // { code: 'fr', name: 'français' },
  // { code: 'he', name: 'עִבְרִית‎' },
  // { code: 'hu', name: 'magyar' },
  // { code: 'id', name: 'bahasa Indonesia' },
  { code: 'it', name: 'italiano' },
  { code: 'ja', name: '日本語' },
  // { code: 'ko', name: '한국어' },
  // { code: 'lt', name: 'lietuvių kalba' },
  // { code: 'nl', name: 'Nederlands' },
  // { code: 'no', name: 'norsk' },
  { code: 'pl', name: 'polski' },
  // { code: 'pt', name: 'português' },
  { code: 'pt-br', name: 'português brasileiro' },
  // { code: 'ro', name: 'română' },
  { code: 'ru', name: 'русский' },
  // { code: 'sk', name: 'slovenčina' },
  // { code: 'sl', name: 'slovenščina' },
  // { code: 'sr', name: 'српски' },
  { code: 'sv', name: 'svenska' },
  // { code: 'th', name: 'ไทย' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'uk', name: 'українська мова' },
  { code: 'vi', name: 'tiếng Việt' },
  { code: 'zh', name: '简体中文' },
  { code: 'zh-tw', name: '繁體中文（台灣）' },
] as const;

export function IntlProviderWrapper({ children }: PropsWithChildren<unknown>) {
  const [locale, setLocale] = useState(() => {
    const storageLocale = localStorage.getItem('locale');

    if (storageLocale) {
      return storageLocale;
    }

    const navigatorLanguages = navigator.languages ?? [navigator.language || 'en'];

    for (let navigatorLanguage of navigatorLanguages) {
      navigatorLanguage = navigatorLanguage.toLowerCase();

      // Not technically correct but should be fine for the few locales targeted here.
      // <https://datatracker.ietf.org/doc/html/rfc5646#section-2.1>
      const [language, region] = navigatorLanguage.split('-');
      const languageAndRegion = region ? `${language}-${region}` : language;

      if (locales.some((locale) => locale.code === languageAndRegion)) {
        return languageAndRegion;
      }

      if (locales.some((locale) => locale.code === language)) {
        return language;
      }
    }

    return 'en';
  });
  const contextValue: IntlContextValue = useMemo(
    () => [
      locale,
      (newLocale) => {
        localStorage.setItem('locale', newLocale);
        setLocale(newLocale);
      },
    ],
    [locale],
  );
  const messages = useMemo(() => loadMessages(locale), [locale]);

  return (
    <intlContext.Provider value={contextValue}>
      <IntlProvider defaultLocale='en' locale={locale} messages={messages}>
        {children}
      </IntlProvider>
    </intlContext.Provider>
  );
}

export function useLocaleState() {
  return useRequiredContext(intlContext);
}
