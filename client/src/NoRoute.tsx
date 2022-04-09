import { FormattedMessage } from 'react-intl';
import useTitle from './useTitle';

export function NoRoute() {
  useTitle('Not found');

  return (
    <FormattedMessage
      defaultMessage="There's nothing here =("
      description='[Errors] Body of "not found" page'
      tagName='span'
    />
  );
}
