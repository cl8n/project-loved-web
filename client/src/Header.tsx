import { NavLink, Link } from 'react-router-dom';
import { loginUrl, useOsuAuth } from './osuAuth';
import { canReadAs } from './permissions';
import { UserInline } from './UserInline';

export function Header() {
  const { logOut, user } = useOsuAuth();

  return (
    <header className='big-center'>
      <div className='info'>
        <Link className='logo' to='/'>Project Loved</Link>
        <span>Language: English</span>
        {user == null
          ? <a href={loginUrl}>Login with osu!</a>
          : <span>
              <UserInline user={user} /> — {' '}
              <button className='fake-a' onClick={logOut}>Log out</button>
            </span>
        }
      </div>
      <nav>
        <NavLink exact to='/'>Submissions</NavLink>
        <NavLink to='/submit'>Submit a map</NavLink>
        <NavLink to='/captains'>Captains</NavLink>
        {user != null && canReadAs(user, 'any') &&
          <>
            <span>Admin:</span>
            <NavLink to='/admin/picks'>Picks</NavLink>
            <NavLink to='/admin/manage'>Manage</NavLink>
          </>
        }
        <span>External:</span>
        <a href='https://osu.ppy.sh/beatmapsets?s=loved'>Loved listing</a>
        <a href='https://osu.ppy.sh/community/forums/120'>Forum</a>
        <a href='https://osu.ppy.sh/wiki/Project_Loved'>Wiki</a>
      </nav>
    </header>
  );
}
