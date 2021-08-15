import { FormattedMessage } from 'react-intl';
import { NavLink, Link } from 'react-router-dom';
import { locales, useLocaleState } from './intl';
import { loginUrl, useOsuAuth } from './osuAuth';
import { canReadAs } from './permissions';
import { UserInline } from './UserInline';

export function Header() {
  const { logOut, user } = useOsuAuth();

  return (
    <header className='big-center'>
      <div className='info'>
        <Link className='logo' to='/'>
          <FormattedMessage
            defaultMessage='Project Loved'
            description='Site title'
          />
        </Link>
        <span>
          <FormattedMessage
            defaultMessage='Language: {selector}'
            description='Selector in site header to change language'
            values={{ selector: <LocaleSelector /> }}
          />
        </span>
        {user == null
          ? <a href={loginUrl}>
              <FormattedMessage
                defaultMessage='Log in with osu!'
                description='Button in site header to log in'
              />
            </a>
          : <span>
              <UserInline showId user={user} /> — {' '}
              <button type='button' className='fake-a' onClick={logOut}>
                <FormattedMessage
                  defaultMessage='Log out'
                  description='Button in site header to log out'
                />
              </button>
            </span>
        }
      </div>
      <nav>
        <NavLink
          className='attention'
          isActive={(_, location) => location.pathname.startsWith('/submissions')}
          to='/'
        >
          <FormattedMessage
            defaultMessage='Submissions'
            description='Nav link'
          />
        </NavLink>
        <NavLink
          className='attention'
          to='/submit'
        >
          <FormattedMessage
            defaultMessage='Submit a map'
            description='Nav link'
          />
        </NavLink>
        <NavLink to='/mappers'>
          <FormattedMessage
            defaultMessage='Mapper consents'
            description='Nav link'
          />
        </NavLink>
        <NavLink to='/team'>
          <FormattedMessage
            defaultMessage='Team'
            description='Nav link'
          />
        </NavLink>
        <NavLink to='/statistics'>
          <FormattedMessage
            defaultMessage='Statistics'
            description='Nav link'
          />
        </NavLink>
        {user != null && canReadAs(user, 'any') &&
          <>
            <FormattedMessage
              defaultMessage='Admin:'
              description='Nav separator'
              tagName='span'
            />
            <NavLink to='/admin/picks'>
              <FormattedMessage
                defaultMessage='Picks'
                description='Nav link'
              />
            </NavLink>
            <NavLink to='/admin/manage'>
              <FormattedMessage
                defaultMessage='Manage'
                description='Nav link'
              />
            </NavLink>
          </>
        }
        <FormattedMessage
          defaultMessage='External:'
          description='Nav separator'
          tagName='span'
        />
        <a href='https://osu.ppy.sh/beatmapsets?s=loved'>
          <FormattedMessage
            defaultMessage='Loved listing'
            description='Nav link'
          />
        </a>
        <a href='https://osu.ppy.sh/community/forums/120'>
          <FormattedMessage
            defaultMessage='Forum'
            description='Nav link'
          />
        </a>
        <a href='https://osu.ppy.sh/wiki/Project_Loved'>
          <FormattedMessage
            defaultMessage='Wiki'
            description='Nav link'
          />
        </a>
      </nav>
    </header>
  );
}

function LocaleSelector() {
  const [locale, setLocale] = useLocaleState();

  return (
    <select
      className='locale-selector'
      onChange={(e) => setLocale(e.target.value)}
      value={locale}
    >
      {locales.map(({ code, name }) => (
        <option key={code} value={code}>{name}</option>
      ))}
    </select>
  );
}
