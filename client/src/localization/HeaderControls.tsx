import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { locales } from '../intl';

function exportMessages(): void {
  const event = document.createEvent('Event');
  event.initEvent('exportMessages');
  document.dispatchEvent(event);
}

interface HeaderControlsProps {
  locale: string | undefined;
  progress: readonly [number, number] | undefined;
}

export default function HeaderControls({ locale, progress }: HeaderControlsProps) {
  const [localeInput, setLocaleInput] = useState('');
  const navigate = useNavigate();

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
          disabled={!/^[a-z-]{2,5}$/.test(localeInput)}
          onClick={() => {
            if (localeInput !== locale) {
              navigate(localeInput);
            }

            setLocaleInput('');
          }}
        >
          Change locale
        </button>
      </div>
      <div className='flex-left'>
        {progress != null && (
          <>
            <meter max={progress[1]} value={progress[0]} />
            <span>
              {progress[0]} / {progress[1]}
            </span>
          </>
        )}
        <button
          type='button'
          disabled={progress == null || progress[0] === 0}
          onClick={exportMessages}
        >
          Export messages
        </button>
      </div>
    </div>
  );
}
