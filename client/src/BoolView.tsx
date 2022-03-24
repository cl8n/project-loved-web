import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
  no: {
    defaultMessage: 'No',
    description: 'Boolean',
  },
  yes: {
    defaultMessage: 'Yes',
    description: 'Boolean',
  },
});

interface BoolViewProps {
  noColor?: boolean;
  option?: boolean;
  value: boolean;
}

export function BoolView({ noColor, option, value }: BoolViewProps) {
  const intl = useIntl();
  let className: string | undefined;

  if (!noColor) {
    className = value ? 'success' : 'error';
  }

  return option ? (
    <option className={className} value={+value}>
      {intl.formatMessage(value ? messages.yes : messages.no)}
    </option>
  ) : (
    <span className={className}>{intl.formatMessage(value ? messages.yes : messages.no)}</span>
  );
}
