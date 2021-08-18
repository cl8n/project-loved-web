import { FormattedMessage } from 'react-intl';

export function NoRoute() {
  return (
    <FormattedMessage
      defaultMessage="There's nothing here =("
      description='Body of "not found" page'
      tagName='span'
    />
  );
}
