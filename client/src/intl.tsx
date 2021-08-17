import { createContext, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { IntlProvider, MessageFormatElement } from 'react-intl';
import { useRequiredContext } from './react-helpers';

type IntlContextValue = [string, (locale: string) => void];

const intlContext = createContext<IntlContextValue | undefined>(undefined);

function loadMessages(locale: string) {
  return import(`./compiled-translations/${locale}.json`)
    .then((module) => module.default)
    .catch(() => ({}));
}

export const locales = [
  { code: 'en', name: 'English' },
  { code: 'fi', name: 'Suomi' },
  { code: 'ja', name: '日本語' },
  { code: 'sv', name: 'Svenska' },
] as const;

export function IntlProviderWrapper({ children }: PropsWithChildren<{}>) {
  // TODO: Default based on browser/OS setting
  const [locale, setLocale] = useState(localStorage.getItem('locale') ?? 'en');
  const [messages, setMessages] = useState<Record<string, MessageFormatElement[]>>();

  const contextValue: IntlContextValue = useMemo(() => [
    locale,
    (newLocale) => {
      setLocale(newLocale);
      localStorage.setItem('locale', newLocale);
    },
  ], [locale]);

  useEffect(() => {
    loadMessages(locale).then(setMessages);
  }, [locale]);

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
