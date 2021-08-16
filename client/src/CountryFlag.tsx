import { useEffect, useState } from 'react';
import missingFlag from './images/flags/__.png';

type CountryFlagProps = {
  country: string;
};

export default function CountryFlag({ country }: CountryFlagProps) {
  const [src, setSrc] = useState(missingFlag);

  useEffect(() => {
    import('./flags').then(({ flagSrc }) => setSrc(flagSrc(country)));
  }, [country]);

  return (
    <img
      alt={`${country} flag`}
      src={src}
    />
  );
}
