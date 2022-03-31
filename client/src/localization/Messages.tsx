import { useCallback, useEffect, useState } from 'react';
import Message from './Message';

type ExportedMessages = Record<string, { defaultMessage: string; description: string }>;

function formatForEditing(messages: ExportedMessages): Record<string, string> {
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

function loadMessages(locale: string): Promise<ExportedMessages> {
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
  const [englishMessages, setEnglishMessages] = useState<ExportedMessages>();
  const [localeMessages, setLocaleMessages] = useState<Record<string, string | undefined>>();
  const updateMessage = useCallback((id: string, value: string) => {
    setLocaleMessages((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  }, []);

  useEffect(() => {
    loadMessages('en').then(setEnglishMessages);
  }, []);
  useEffect(() => {
    loadMessages(locale).then((exportedMessages) => {
      setLocaleMessages(formatForEditing(exportedMessages));
    });
  }, [locale]);

  useEffect(() => {
    const exportMessagesListener = () => {
      if (localeMessages == null) {
        return;
      }

      const blob = new Blob([formatForExporting(localeMessages)], { type: 'application/json' });
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
  }, [locale, localeMessages]);

  if (englishMessages == null || localeMessages == null) {
    return <p>Loading messages...</p>;
  }

  return (
    <>
      {Object.entries(englishMessages).map(([id, { defaultMessage, description }]) => (
        <Message
          key={id}
          description={description}
          englishMessage={defaultMessage}
          id={id}
          localeMessage={localeMessages[id]}
          updateMessage={updateMessage}
        />
      ))}
    </>
  );
}
