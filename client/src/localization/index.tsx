import { useState } from 'react';
import { Redirect, useHistory, useParams } from 'react-router-dom';
import { locales } from '../intl';
import Messages from './Messages';

export default function Localization() {
  const history = useHistory();
  const { locale } = useParams<{ locale: string | undefined }>();
  const [localeInput, setLocaleInput] = useState('');

  if (locale != null && locale !== locale.toLowerCase())
    return <Redirect to={`/localization/${locale.toLowerCase()}`} />;

  const localeName = locales.find(({ code }) => code === locale)?.name;
  const exportMessages = () => {
    const event = document.createEvent('Event');
    event.initEvent('exportMessages');
    document.dispatchEvent(event);
  };

  return (
    <>
      <div className='content-block'>
        <h1>Localization</h1>
        <p>To translate this website:</p>
        <ul>
          <li>
            Select your locale below, or manually input the BCP 47 tag if it doesn't exist yet
          </li>
          <li>
            Translate the messages (you don't have to do all at once). Keep any colored text
            verbatim from the English messages. If you need to use special language for plural
            types, gendered words, etc., look up how to use ICU MessageFormat to do this.
          </li>
          <li>Click "Export messages"</li>
          <li>
            Either commit the resulting file to a fork of{' '}
            <a href='https://github.com/cl8n/project-loved-web'>project-loved-web</a> and open a
            pull request, or send it to someone else who can do that for you
          </li>
          <li>
            Keep in mind that (for now) this page doesn't save any of your work. Anything you type
            into the boxes will be cleared when you close the page or navigate away.
          </li>
        </ul>
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
                if (localeInput !== locale) history.push(`/localization/${localeInput}`);

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
      </div>
      <div className='content-block'>
        {locale == null || locale === 'en' ? (
          'No locale selected'
        ) : (
          <>
            <h2>{localeName != null ? `${localeName} (${locale})` : locale}</h2>
            <Messages locale={locale} />
          </>
        )}
      </div>
    </>
  );
}
