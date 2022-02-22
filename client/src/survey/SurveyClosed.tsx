import { FormattedMessage } from 'react-intl';
import useTitle from '../useTitle';

export default function SurveyClosed() {
  useTitle('Survey closed');

  return (
    <>
      <FormattedMessage
        defaultMessage='Survey closed'
        description='Title of "survey closed" page'
        tagName='h1'
      />
      <FormattedMessage
        defaultMessage='This survey has been closed. Thanks for your participation!'
        description='Body of "survey closed" page'
        tagName='p'
      />
    </>
  );
}
