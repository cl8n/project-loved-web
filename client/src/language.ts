type TranslationsLiteral = typeof translations;
type Language = keyof TranslationsLiteral;
type TranslationKey = keyof TranslationsLiteral['en'];
type Translations = {
  [P in Language as Exclude<P, 'en'>]: Partial<TranslationsLiteral['en']>;
} & {
  en: TranslationsLiteral['en'];
};

const translations = {
  en: {
    // Header
    title: 'Project Loved',
    language_select: 'Language: ',
    log_in: 'Log in with osu!',
    log_out: 'Log out',
    submissions: 'Submissions',
    submit: 'Submit a map',
    consents: 'Mapper consents',
    captains: 'Captains',
    statistics: 'Statistics',
    admin: 'Admin:',
    picks: 'Picks',
    manage: 'Manage',
    external: 'External:',
    listing: 'Loved listing',
    forum: 'Forum',
    wiki: 'Wiki',
  },
};

export const languages = [
  ['en', 'English'],
  /*
  ['ar', 'اَلْعَرَبِيَّةُ‎'],
  ['be', 'Беларуская мова'],
  ['bg', 'Български'],
  ['cs', 'Česky'],
  ['da', 'Dansk'],
  ['de', 'Deutsch'],
  ['el', 'Ελληνικά'],
  ['es', 'español'],
  ['fi', 'Suomi'],
  ['fr', 'français'],
  ['hu', 'Magyar'],
  ['id', 'Bahasa Indonesia'],
  ['it', 'Italiano'],
  ['ja', '日本語'],
  ['ko', '한국어'],
  ['nl', 'Nederlands'],
  ['no', 'Norsk'],
  ['pl', 'polski'],
  ['pt', 'Português'],
  ['pt-br', 'Português (Brasil)'],
  ['ro', 'Română'],
  ['ru', 'Русский'],
  ['sk', 'Slovenčina'],
  ['sv', 'Svenska'],
  ['th', 'ไทย'],
  ['tl', 'Tagalog'],
  ['tr', 'Türkçe'],
  ['uk', 'Українська мова'],
  ['vi', 'Tiếng Việt'],
  ['zh', '简体中文'],
  ['zh-hk', '繁體中文（香港）'],
  ['zh-tw', '繁體中文（台灣）'],
  */
] as const;

export let language = (localStorage.getItem('language') ?? 'en') as Language;

export function setLanguage(lang: Language): void {
  try {
    localStorage.setItem('language', lang);
  } catch {}

  language = lang;
}

export function l10n(key: TranslationKey): string {
  return (translations as Translations)[language][key] ?? translations.en[key];
};
