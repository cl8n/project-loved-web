import { FormattedMessage } from 'react-intl';
import PollResults from './PollResults';

export default function Statistics() {
  return (
    <div className='content-block'>
      <FormattedMessage
        defaultMessage='Poll results'
        description='Poll results title'
        tagName='h1'
      />
      <PollResults />
    </div>
  );
}
