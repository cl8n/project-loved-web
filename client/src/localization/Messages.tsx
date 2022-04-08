import { Fragment, useCallback, useEffect, useState } from 'react';
import Message from './Message';

type CategorizedEnglishMessages = {
  category: string;
  messages: { defaultMessage: string; description: string; id: string }[];
}[];
type EnglishMessages = Record<
  string,
  { category?: string; defaultMessage: string; description: string }
>;
type TranslatedMessages = Record<string, { defaultMessage: string }>;

function formatForEditing(messages: TranslatedMessages): Record<string, string> {
  const editingMessages: Record<string, string> = {};

  for (const message of Object.entries(messages)) {
    editingMessages[message[0]] = message[1].defaultMessage;
  }

  return editingMessages;
}

function formatForExporting(messages: Record<string, string | undefined>): string {
  const exportingMessages: Record<string, { defaultMessage: string }> = {};

  for (const message of Object.entries(messages)) {
    if (message[1]) {
      exportingMessages[message[0]] = { defaultMessage: message[1] };
    }
  }

  return JSON.stringify(exportingMessages, null, 2) + '\n';
}

function loadMessages(locale: 'en'): Promise<EnglishMessages>;
function loadMessages(locale: string): Promise<TranslatedMessages>;
function loadMessages(locale: string): Promise<EnglishMessages | TranslatedMessages> {
  return import(
    /* webpackChunkName: "translations" */
    /* webpackMode: "lazy-once" */
    `../translations/${locale}.json`
  )
    .then(({ default: translationsExport }) => translationsExport)
    .catch(() => ({}));
}

interface MessagesProps {
  locale: string;
}

export default function Messages({ locale }: MessagesProps) {
  const [englishMessages, setEnglishMessages] = useState<CategorizedEnglishMessages>();
  const [localeMessages, setLocaleMessages] = useState<Record<string, string | undefined>>();
  const [workingMessages, setWorkingMessages] = useState<Record<string, string | undefined>>();
  const updateMessage = useCallback((id: string, value: string) => {
    setWorkingMessages((prevState) => ({
      ...prevState,
      [id]: value || undefined,
    }));
  }, []);

  useEffect(() => {
    loadMessages('en').then((messages) => {
      const sortedMessages = Object.entries(messages)
        .sort((a, b) => a[1].description.localeCompare(b[1].description))
        .sort((a, b) => {
          const aCategory = a[1].category;
          const bCategory = b[1].category;

          if (aCategory == null || bCategory == null) {
            return +(aCategory == null) - +(bCategory == null);
          }

          return aCategory.localeCompare(bCategory);
        });
      const categorizedMessages: CategorizedEnglishMessages = [];
      let categoryIndex = -1;

      for (const [id, message] of sortedMessages) {
        const category = message.category ?? 'Uncategorized';

        if (categorizedMessages[categoryIndex]?.category !== category) {
          categoryIndex++;
          categorizedMessages[categoryIndex] = { category, messages: [] };
        }

        categorizedMessages[categoryIndex].messages.push({
          defaultMessage: message.defaultMessage,
          description: message.description,
          id,
        });
      }

      setEnglishMessages(categorizedMessages);
    });
  }, []);
  useEffect(() => {
    loadMessages(locale).then((messages) => {
      const messagesForEditing = formatForEditing(messages);

      setLocaleMessages(messagesForEditing);
      setWorkingMessages(messagesForEditing);
    });
  }, [locale]);

  useEffect(() => {
    const exportMessagesListener = () => {
      if (workingMessages == null) {
        return;
      }

      const blob = new Blob([formatForExporting(workingMessages)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${locale}.json`;
      anchor.click();

      anchor.remove();
      URL.revokeObjectURL(url);
    };

    document.addEventListener('exportMessages', exportMessagesListener);
    return () => document.removeEventListener('exportMessages', exportMessagesListener);
  }, [locale, workingMessages]);

  if (englishMessages == null || localeMessages == null || workingMessages == null) {
    return <p>Loading messages...</p>;
  }

  return (
    <>
      {englishMessages.map((messageCategory) => (
        <Fragment key={messageCategory.category}>
          <h2>{messageCategory.category}</h2>
          {messageCategory.messages.map(({ defaultMessage, description, id }) => (
            <Message
              key={id}
              description={description}
              englishMessage={defaultMessage}
              id={id}
              localeMessage={localeMessages[id]}
              updateMessage={updateMessage}
              workingMessage={workingMessages[id]}
            />
          ))}
        </Fragment>
      ))}
    </>
  );
}
