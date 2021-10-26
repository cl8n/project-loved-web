import { useHistory } from 'react-router';
import { locales } from '../intl';

function exportMessages(): void {
  const event = document.createEvent('Event');
  event.initEvent('exportMessages');
  document.dispatchEvent(event);
}

interface HeaderControlsProps {
  locale: string | undefined;
  localeInput: string;
  setLocaleInput: (value: string) => void;
}

export default function HeaderControls({
  locale,
  localeInput,
  setLocaleInput,
}: HeaderControlsProps) {
  const history = useHistory();

  return (
    <div className='flex-bar'>
      <div className='flex-left'>
        <input
          list='locales'
          value={localeInput}
          onChange={(event) => setLocaleInput(event.target.value)}
          placeholder='Locale code'
        />
        <datalist id='locales'>
          {locales.map(
            ({ code, name }) =>
              code !== 'en' && (
                <option key={code} value={code}>
                  {name}
                </option>
              ),
          )}
        </datalist>
        <button
          type='button'
          disabled={!/^[a-z]{2}(?:-[a-z]{2})?$/.test(localeInput)}
          onClick={() => {
            if (localeInput !== locale) {
              history.push(`/localization/${localeInput}`);
            }

            setLocaleInput('');
          }}
        >
          Change locale
        </button>
      </div>
      <button type='button' onClick={exportMessages}>
        Export messages
      </button>
    </div>
  );
}
