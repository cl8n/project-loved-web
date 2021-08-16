import missingFlag from './images/flags/__.png';

export function flagSrc(country: string) {
  try {
    return require(`./images/flags/${country.toLowerCase()}.png`).default;
  } catch {
    return missingFlag;
  }
}
