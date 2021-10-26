import { FormattedMessage } from 'react-intl';
import useTitle from '../useTitle';
import Polls from './Polls';

export default function Statistics() {
  useTitle('Statistics');

  return (
    <div className='content-block'>
      <FormattedMessage
        defaultMessage='Poll results'
        description='Poll results title'
        tagName='h1'
      />
      <Polls />
    </div>
  );
}
