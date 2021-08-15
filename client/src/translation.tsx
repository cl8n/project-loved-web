import { createContext, PropsWithChildren, useMemo, useState } from 'react';
import LocalizedStrings from 'react-localization';
import { useRequiredContext } from './react-helpers';

// TODO: How to import dynamically but still keep types
import en_common from './translations/en/common.json';
import en_header from './translations/en/header.json';
import ja_header from './translations/ja/header.json';

// TODO: Types are a lie o_o
interface LocaleStrings {
  common: typeof en_common,
  header: typeof en_header,
};

const trans = new LocalizedStrings<LocaleStrings>({
  // Default/fallback locale goes first
  en: {
    common: en_common,
    header: en_header,
  },
  ja: {
    header: ja_header,
  } as LocaleStrings,
}, { logsEnabled: false });

export const locales = {
  en: 'English',
  ja: '日本語',
};

interface TranslationContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  trans: LocaleStrings;
}

const translationContext = createContext<TranslationContextValue | undefined>(undefined);

export function TranslationProvider({ children }: PropsWithChildren<{}>) {
  const [locale, _setLocale] = useState(trans.getLanguage());

  const contextValue: TranslationContextValue = useMemo(() => ({
    locale,
    setLocale: (newLocale) => {
      trans.setLanguage(newLocale);
      _setLocale(trans.getLanguage());
    },
    trans,
  }), [locale]);

  return (
    <translationContext.Provider value={contextValue}>
      {children}
    </translationContext.Provider>
  );
}

export function useTranslations() {
  return useRequiredContext(translationContext);
}
