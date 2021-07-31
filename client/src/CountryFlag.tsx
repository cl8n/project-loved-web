import missingFlag from './flags/__.png';

function flagSrc(country: string) {
  try {
    return require(`./flags/${country.toLowerCase()}.png`).default;
  } catch {
    return missingFlag;
  }
}

type CountryFlagProps = {
  country: string;
};

export default function CountryFlag({ country }: CountryFlagProps) {
  return (
    <img
      alt={`${country} flag`}
      src={flagSrc(country)}
    />
  );
}
