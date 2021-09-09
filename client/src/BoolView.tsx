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
  value: boolean;
}

export function BoolView({ noColor, value }: BoolViewProps) {
  const intl = useIntl();
  let className: string | undefined;

  if (!noColor)
    className = value ? 'success' : 'error';

  return (
    <span className={className}>
      {intl.formatMessage(value ? messages.yes : messages.no)}
    </span>
  );
}
