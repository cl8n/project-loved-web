import { memo } from 'react';
import MessageFormatEditor from './MessageFormatEditor';

interface MessageProps {
  description: string;
  englishMessage: string;
  id: string;
  localeMessage: string | undefined;
  updateMessage: (id: string, value: string) => void;
}

function Message({ description, englishMessage, id, localeMessage, updateMessage }: MessageProps) {
  return (
    <div className={`message${localeMessage ? '' : ' message-warning'}`}>
      <h3>{description}</h3>
      <MessageFormatEditor
        className='message-reference'
        readOnly
        value={englishMessage}
      />
      <MessageFormatEditor
        setValue={(value) => updateMessage(id, value)}
        value={localeMessage ?? ''}
      />
    </div>
  );
}

export default memo(Message);
