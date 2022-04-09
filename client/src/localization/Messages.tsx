import { Fragment } from 'react';
import type { CategorizedEnglishMessages } from './helpers';
import Message from './Message';

interface MessagesProps {
  englishMessages: CategorizedEnglishMessages | undefined;
  localeMessages: Record<string, string | undefined> | undefined;
  updateMessage: (id: string, value: string) => void;
  workingMessages: Record<string, string | undefined> | undefined;
}

export default function Messages({
  englishMessages,
  localeMessages,
  updateMessage,
  workingMessages,
}: MessagesProps) {
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
