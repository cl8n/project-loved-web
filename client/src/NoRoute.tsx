import { FormattedMessage } from 'react-intl';
import useTitle from './useTitle';

export function NoRoute() {
  useTitle('Not found');

  return (
    <FormattedMessage
      defaultMessage="There's nothing here =("
      description='Body of "not found" page'
      tagName='span'
    />
  );
}
