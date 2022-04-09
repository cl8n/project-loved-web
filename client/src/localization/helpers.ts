export type CategorizedEnglishMessages = {
  category: string;
  messages: { defaultMessage: string; description: string; id: string }[];
}[];
export type EnglishMessages = Record<
  string,
  { category?: string; defaultMessage: string; description: string }
>;
export type TranslatedMessages = Record<string, { defaultMessage: string }>;

export function formatForEditing(messages: TranslatedMessages): Record<string, string> {
  const editingMessages: Record<string, string> = {};

  for (const message of Object.entries(messages)) {
    editingMessages[message[0]] = message[1].defaultMessage;
  }

  return editingMessages;
}

export function formatForExporting(messages: Record<string, string | undefined>): string {
  const exportingMessages: Record<string, { defaultMessage: string }> = {};

  for (const id of Object.keys(messages).sort()) {
    if (messages[id]) {
      exportingMessages[id] = { defaultMessage: messages[id]! };
    }
  }

  return JSON.stringify(exportingMessages, null, 2) + '\n';
}

export function loadMessages(locale: 'en'): Promise<EnglishMessages>;
export function loadMessages(locale: string): Promise<TranslatedMessages>;
export function loadMessages(locale: string): Promise<EnglishMessages | TranslatedMessages> {
  return import(
    /* webpackChunkName: "translations" */
    /* webpackMode: "lazy-once" */
    `../translations/${locale}.json`
  )
    .then(({ default: translationsExport }) => translationsExport)
    .catch(() => ({}));
}
