import { useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import missingFlag from './images/flags/__.png';

let flags: Record<string, string> | undefined;
const flagsPromise = import('./flags').then(({ default: flagsExport }) => {
  flags = flagsExport;
});

const messages = defineMessages({
  flag: {
    defaultMessage: '{country} flag',
    description: 'Country flag image alt text',
  },
  unknownCountry: {
    defaultMessage: 'Unknown country',
    description: 'Shown in flag image alt text for the "?" flag',
  },
});

interface CountryFlagProps {
  country: string;
}

export default function CountryFlag({ country }: CountryFlagProps) {
  const intl = useIntl();
  const [src, setSrc] = useState(flags?.[country]);

  useEffect(() => {
    if (src == null) {
      flagsPromise.then(() => setSrc(flags?.[country]));
    }
  }, [country, src]);

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
