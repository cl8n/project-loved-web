import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { locales } from '../intl';
import useTitle from '../useTitle';
import Header from './Header';
import HeaderControls from './HeaderControls';
import type { CategorizedEnglishMessages } from './helpers';
import { formatForEditing, formatForExporting, loadMessages } from './helpers';
import Messages from './Messages';

export default function Localization() {
  useTitle('Localization');
  const { locale } = useParams<{ locale: string | undefined }>();
  const [englishMessages, setEnglishMessages] = useState<CategorizedEnglishMessages>();
  const [localeMessages, setLocaleMessages] = useState<Record<string, string | undefined>>();
  const [workingMessages, setWorkingMessages] = useState<Record<string, string | undefined>>();
  const englishMessageIds = useMemo(() => {
    if (englishMessages == null) {
      return undefined;
    }

    const ids: string[] = [];

    for (const { messages } of englishMessages) {
      for (const { id } of messages) {
        ids.push(id);
      }
    }

    return ids;
  }, [englishMessages]);
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
    setLocaleMessages(undefined);
    setWorkingMessages(undefined);

    if (locale == null || locale === 'en') {
      return;
    }

    loadMessages(locale).then((messages) => {
      const messagesForEditing = formatForEditing(messages);

      setLocaleMessages(messagesForEditing);
      setWorkingMessages(messagesForEditing);
    });
  }, [locale]);

  useEffect(() => {
    const exportMessagesListener = () => {
      if (englishMessageIds == null || workingMessages == null) {
        return;
      }

      const blob = new Blob([formatForExporting(workingMessages, englishMessageIds)], {
        type: 'application/json',
      });
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
  }, [englishMessageIds, locale, workingMessages]);

  if (locale != null && locale !== locale.toLowerCase()) {
    return <Navigate replace to={locale.toLowerCase()} />;
  }

  const localeName = locales.find(({ code }) => code === locale)?.name;
  const progress =
    englishMessageIds == null || workingMessages == null
      ? undefined
      : ([
          englishMessageIds.reduce((sum, id) => (workingMessages[id] ? sum + 1 : sum), 0),
          englishMessageIds.length,
        ] as const);

  return (
    <>
      <div className='content-block'>
        <Header />
        <HeaderControls locale={locale} progress={progress} />
      </div>
      <div className='content-block'>
        {locale == null || locale === 'en' ? (
          'No locale selected'
        ) : (
          <>
            <h1>{localeName != null ? `${localeName} (${locale})` : locale}</h1>
            <Messages
              englishMessages={englishMessages}
              localeMessages={localeMessages}
              updateMessage={updateMessage}
              workingMessages={workingMessages}
            />
          </>
        )}
      </div>
    </>
  );
}
