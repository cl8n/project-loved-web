import { useState } from 'react';
import { Redirect, useParams } from 'react-router-dom';
import { locales } from '../intl';
import useTitle from '../useTitle';
import Header from './Header';
import HeaderControls from './HeaderControls';
import Messages from './Messages';

export default function Localization() {
  useTitle('Localization');
  const { locale } = useParams<{ locale: string | undefined }>();
  const [localeInput, setLocaleInput] = useState('');

  if (locale != null && locale !== locale.toLowerCase()) {
    return <Redirect to={`/localization/${locale.toLowerCase()}`} />;
  }

  const localeName = locales.find(({ code }) => code === locale)?.name;

  return (
    <>
      <div className='content-block'>
        <Header />
        <HeaderControls {...{ locale, localeInput, setLocaleInput }} />
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
