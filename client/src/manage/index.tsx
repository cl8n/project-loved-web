import { NavLink, Outlet } from 'react-router-dom';
import useTitle from '../useTitle';

export default function Manage() {
  useTitle('Management');

  return (
    <>
      <nav className='nested'>
        <NavLink to='roles'>Roles</NavLink>
        <NavLink to='api-objects'>API objects</NavLink>
        <NavLink to='logs'>Logs</NavLink>
        <NavLink to='forum-opt-in'>Forum opt-in</NavLink>
        <NavLink to='settings'>Site settings</NavLink>
        <NavLink to='client-key'>Client key</NavLink>
      </nav>
      <Outlet />
    </>
  );
}
