import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { NavLink, Link } from 'react-router-dom';
import globeIcon from './images/icons8/globe.png';
import sunIcon from './images/icons8/sun.png';
import { locales, useLocaleState } from './intl';
import { loginUrl, useOsuAuth } from './osuAuth';
import { hasRole } from './permissions';
import { UserInline } from './UserInline';

const messages = defineMessages({
  dark: {
    defaultMessage: 'Dark',
    description: 'Option for dark theme',
  },
  light: {
    defaultMessage: 'Light',
    description: 'Option for light theme',
  },
});

export function Header() {
  const { logOut, user } = useOsuAuth();

  return (
    <header className='big-center'>
      <div className='info'>
        <Link className='logo' to='/'>
          <FormattedMessage defaultMessage='Project Loved' description='Site title' />
        </Link>
        <span className='icon-label-container'>
          <img alt='' src={sunIcon} className='invert-icon' />
          <FormattedMessage
            defaultMessage='Theme: {selector}'
            description='Selector in site header to change theme'
            tagName='span'
            values={{ selector: <ThemeSelector /> }}
          />
        </span>
        <span className='icon-label-container'>
          <img alt='' src={globeIcon} className='invert-icon' />
          <FormattedMessage
            defaultMessage='Language: {selector}'
            description='Selector in site header to change language'
            tagName='span'
            values={{ selector: <LocaleSelector /> }}
          />
        </span>
        {user == null ? (
          <a href={loginUrl}>
            <FormattedMessage
              defaultMessage='Log in with osu!'
              description='Button in site header to log in'
            />
          </a>
        ) : (
          <span>
            <UserInline showId user={user} /> —{' '}
            <button type='button' className='fake-a' onClick={logOut}>
              <FormattedMessage
                defaultMessage='Log out'
                description='Button in site header to log out'
              />
            </button>
          </span>
        )}
      </div>
      <nav>
        <NavLink
          className='attention'
          isActive={(_, location) => location.pathname.startsWith('/submissions')}
          to='/'
        >
          <FormattedMessage defaultMessage='Submissions' description='Nav link' />
        </NavLink>
        <NavLink className='attention' to='/submit'>
          <FormattedMessage defaultMessage='Submit a map' description='Nav link' />
        </NavLink>
        <NavLink to='/mappers'>
          <FormattedMessage defaultMessage='Mapper consents' description='Nav link' />
        </NavLink>
        <NavLink to='/team'>
          <FormattedMessage defaultMessage='Team' description='Nav link' />
        </NavLink>
        <NavLink to='/statistics'>
          <FormattedMessage defaultMessage='Statistics' description='Nav link' />
        </NavLink>
        <NavLink to='/more'>
          <FormattedMessage defaultMessage='More' description='Nav link' />
        </NavLink>
        <FormattedMessage defaultMessage='External:' description='Nav separator' tagName='span' />
        <a href='https://osu.ppy.sh/beatmapsets?s=loved'>
          <FormattedMessage defaultMessage='Loved listing' description='Nav link' />
        </a>
        <a href='https://osu.ppy.sh/community/forums/120'>
          <FormattedMessage defaultMessage='Forum' description='Nav link' />
        </a>
        <a href='https://osu.ppy.sh/wiki/Project_Loved'>
          <FormattedMessage defaultMessage='Wiki' description='Nav link' />
        </a>
        {user != null && hasRole(user, 'any') && (
          <>
            <FormattedMessage defaultMessage='Admin:' description='Nav separator' tagName='span' />
            <NavLink to='/admin/picks'>
              <FormattedMessage defaultMessage='Picks' description='Nav link' />
            </NavLink>
            <NavLink to='/admin/manage'>
              <FormattedMessage defaultMessage='Manage' description='Nav link' />
            </NavLink>
          </>
        )}
        {/* TODO: <Dropdown align='right' data-clayton-websites>
          <h3>My websites</h3>
          <Link className='active' to='/'>
            <FormattedMessage
              defaultMessage='Project Loved'
              description='Site title'
            />
            {' — loved.sh'}
          </Link>
        </Dropdown>*/}
      </nav>
    </header>
  );
}

function LocaleSelector() {
  const [locale, setLocale] = useLocaleState();

  return (
    <select onChange={(event) => setLocale(event.target.value)} value={locale}>
      {locales.map(({ code, name }) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
}

function ThemeSelector() {
  const intl = useIntl();
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  );
  const onThemeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    localStorage.setItem('theme', event.target.value);
    setTheme(event.target.value);
  };

  useEffect(() => {
    document.querySelector('html')!.dataset.theme = theme;
  }, [theme]);

  return (
    <select onChange={onThemeChange} value={theme}>
      <option value='dark'>{intl.formatMessage(messages.dark)}</option>
      <option value='light'>{intl.formatMessage(messages.light)}</option>
    </select>
  );
}
