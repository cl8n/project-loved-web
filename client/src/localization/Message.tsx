import { memo } from 'react';
import MessageFormatEditor from './MessageFormatEditor';

interface MessageProps {
  description: string;
  englishMessage: string;
  id: string;
  localeMessage: string | undefined;
  updateMessage: (id: string, value: string) => void;
  workingMessage: string | undefined;
}

function Message({
  description,
  englishMessage,
  id,
  localeMessage,
  updateMessage,
  workingMessage,
}: MessageProps) {
  const classNames = ['message'];

  if (!workingMessage) {
    classNames.push('message-warning');
  } else if (localeMessage !== workingMessage) {
    classNames.push('message-modified');
  }

  return (
    <div className={classNames.join(' ')}>
      <h3>{description}</h3>
      <MessageFormatEditor className='message-reference' readOnly value={englishMessage} />
      <MessageFormatEditor
        setValue={(value) => updateMessage(id, value)}
        value={workingMessage ?? ''}
      />
    </div>
  );
}

export default memo(Message);
