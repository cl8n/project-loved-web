import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { NavLink, Link } from 'react-router-dom';
import globeIcon from './images/icons8/globe.png';
import sunIcon from './images/icons8/sun.png';
import { locales, useLocaleState } from './intl';
import { loginUrl, useOsuAuth } from './osuAuth';
import { hasRole } from './permissions';
import { useThemeState } from './theme';
import { UserInline } from './UserInline';

const messages = defineMessages({
  dark: {
    defaultMessage: 'Dark',
    description: '[Header] Option for dark theme',
  },
  light: {
    defaultMessage: 'Light',
    description: '[Header] Option for light theme',
  },
});

export function Header() {
  const { logOut, user } = useOsuAuth();

  return (
    <header className='big-center'>
      <div className='info'>
        <Link className='logo' to='/'>
          <FormattedMessage defaultMessage='Project Loved' description='[Header] Site title' />
        </Link>
        <span className='icon-label-container'>
          <img alt='' src={sunIcon} className='invert-icon' />
          <FormattedMessage
            defaultMessage='Theme: {selector}'
            description='[Header] Selector in site header to change theme'
            tagName='span'
            values={{ selector: <ThemeSelector /> }}
          />
        </span>
        <span className='icon-label-container'>
          <img alt='' src={globeIcon} className='invert-icon' />
          <FormattedMessage
            defaultMessage='Language: {selector}'
            description='[Header] Selector in site header to change language'
            tagName='span'
            values={{ selector: <LocaleSelector /> }}
          />
        </span>
        {user == null ? (
          <a href={loginUrl}>
            <FormattedMessage
              defaultMessage='Log in with osu!'
              description='[Header] Button in site header to log in'
            />
          </a>
        ) : (
          <span>
            <UserInline showId user={user} /> —{' '}
            <button type='button' className='fake-a' onClick={logOut}>
              <FormattedMessage
                defaultMessage='Log out'
                description='[Header] Button in site header to log out'
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
          <FormattedMessage defaultMessage='Submissions' description='[Header] Nav link' />
        </NavLink>
        <NavLink className='attention' to='/submit'>
          <FormattedMessage defaultMessage='Submit a map' description='[Header] Nav link' />
        </NavLink>
        <NavLink to='/mappers'>
          <FormattedMessage defaultMessage='Mapper consents' description='[Header] Nav link' />
        </NavLink>
        <NavLink to='/team'>
          <FormattedMessage defaultMessage='Team' description='[Header] Nav link' />
        </NavLink>
        <NavLink to='/statistics'>
          <FormattedMessage defaultMessage='Statistics' description='[Header] Nav link' />
        </NavLink>
        <NavLink to='/more'>
          <FormattedMessage defaultMessage='More' description='[Header] Nav link' />
        </NavLink>
        <FormattedMessage
          defaultMessage='External:'
          description='[Header] Nav separator'
          tagName='span'
        />
        <a href='https://osu.ppy.sh/beatmapsets?s=loved'>
          <FormattedMessage defaultMessage='Loved listing' description='[Header] Nav link' />
        </a>
        <a href='https://osu.ppy.sh/wiki/Project_Loved'>
          <FormattedMessage defaultMessage='Wiki' description='[Header] Nav link' />
        </a>
        {user != null && hasRole(user, 'any') && (
          <>
            <FormattedMessage
              defaultMessage='Admin:'
              description='[Header] Nav separator'
              tagName='span'
            />
            <NavLink to='/admin/picks'>
              <FormattedMessage defaultMessage='Picks' description='[Header] Nav link' />
            </NavLink>
            <NavLink to='/admin/manage'>
              <FormattedMessage defaultMessage='Manage' description='[Header] Nav link' />
            </NavLink>
          </>
        )}
        {/* TODO: <Dropdown align='right' data-clayton-websites>
          <h3>My websites</h3>
          <Link className='active' to='/'>
            <FormattedMessage
              defaultMessage='Project Loved'
              description='[Header] Site title'
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
  const [theme, setTheme] = useThemeState();

  return (
    <select onChange={(event) => setTheme(event.target.value as 'dark' | 'light')} value={theme}>
      <option value='dark'>{intl.formatMessage(messages.dark)}</option>
      <option value='light'>{intl.formatMessage(messages.light)}</option>
    </select>
  );
}
