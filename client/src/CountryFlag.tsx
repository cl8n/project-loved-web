import { useEffect, useState } from 'react';
import missingFlag from './images/flags/__.png';

let flags: Record<string, string> | undefined;
const flagsPromise = import('./flags').then(({ default: flagsExport }) => { flags = flagsExport });

type CountryFlagProps = {
  country: string;
};

export default function CountryFlag({ country }: CountryFlagProps) {
  const [src, setSrc] = useState(flags?.[country]);

  useEffect(() => {
    if (src == null)
      flagsPromise.then(() => setSrc(flags?.[country]));
  }, [country, src]);

  return src == null
    ? <img alt='Unknown country flag' src={missingFlag} />
    : <img alt={`${country} flag`} src={src} />
}
