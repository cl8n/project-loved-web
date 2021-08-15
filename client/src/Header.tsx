import { NavLink, Link } from 'react-router-dom';
import { loginUrl, useOsuAuth } from './osuAuth';
import { canReadAs } from './permissions';
import { locales, useTranslations } from './translation';
import { UserInline } from './UserInline';

export function Header() {
  const { logOut, user } = useOsuAuth();
  const { trans } = useTranslations();

  return (
    <header className='big-center'>
      <div className='info'>
        <Link className='logo' to='/'>{trans.common.title}</Link>
        <span>{trans.header.language}: <LocaleSelector /></span>
        {user == null
          ? <a href={loginUrl}>{trans.header.log_in}</a>
          : <span>
              <UserInline showId user={user} /> — {' '}
              <button type='button' className='fake-a' onClick={logOut}>{trans.header.log_out}</button>
            </span>
        }
      </div>
      <nav>
        <NavLink
          className='attention'
          isActive={(_, location) => location.pathname.startsWith('/submissions')}
          to='/'
        >
          {trans.header.nav.submissions}
        </NavLink>
        <NavLink
          className='attention'
          to='/submit'
        >
          {trans.header.nav.submit}
        </NavLink>
        <NavLink to='/mappers'>{trans.header.nav.consents}</NavLink>
        <NavLink to='/team'>{trans.header.nav.team}</NavLink>
        <NavLink to='/statistics'>{trans.header.nav.statistics}</NavLink>
        {user != null && canReadAs(user, 'any') &&
          <>
            <span>{trans.header.nav.admin}:</span>
            <NavLink to='/admin/picks'>{trans.header.nav.rounds}</NavLink>
            <NavLink to='/admin/manage'>{trans.header.nav.manage}</NavLink>
          </>
        }
        <span>{trans.header.nav.external}:</span>
        <a href='https://osu.ppy.sh/beatmapsets?s=loved'>{trans.header.nav.listing}</a>
        <a href='https://osu.ppy.sh/community/forums/120'>{trans.header.nav.forum}</a>
        <a href='https://osu.ppy.sh/wiki/Project_Loved'>{trans.header.nav.wiki}</a>
      </nav>
    </header>
  );
}

function LocaleSelector() {
  const { locale, setLocale } = useTranslations();

  return (
    <select
      className='locale-selector'
      onChange={(e) => setLocale(e.target.value)}
      value={locale}
    >
      {Object.entries(locales).map(([localeKey, localeName]) => (
        <option key={localeKey} value={localeKey}>{localeName}</option>
      ))}
    </select>
  );
}
