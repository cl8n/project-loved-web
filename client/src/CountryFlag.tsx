import { defineMessages, useIntl } from 'react-intl';
import flags from './flags';
import missingFlag from './images/flags/__.png';

const messages = defineMessages({
  flag: {
    defaultMessage: '{country} flag',
    description: '[Flag icons] Country flag image alt text',
  },
  unknownCountry: {
    defaultMessage: 'Unknown country',
    description: '[Flag icons] Shown in flag image alt text for the "?" flag',
  },
});

interface CountryFlagProps {
  country: string;
}

export default function CountryFlag({ country }: CountryFlagProps) {
  const intl = useIntl();
  const src = flags[country];

  return src == null ? (
    <img
      alt={intl.formatMessage(messages.flag, {
        country: intl.formatMessage(messages.unknownCountry),
      })}
      src={missingFlag}
    />
  ) : (
    <img alt={intl.formatMessage(messages.flag, { country })} src={src} />
  );
}
