import { NavLink, Link } from 'react-router-dom';
import { loginUrl, useOsuAuth } from './osuAuth';

export function Header() {
  const user = useOsuAuth().user;

  return (
    <header className='big-center container'>
      <div className='info'>
        <Link className='logo' to='/'>Project Loved</Link>
        {user == null
          ? <a href={loginUrl}>Login with osu!</a>
          : <span>Logged in as {user.name} [#{user.id}]</span>
        }
      </div>
      <nav>
        <NavLink to='/'>Submissions</NavLink>
        <NavLink to='/submit'>Submit a map</NavLink>
        <NavLink to='/captains'>Captains</NavLink>
        {user != null &&
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
