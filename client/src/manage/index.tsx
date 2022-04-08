import { Role } from 'loved-bridge/tables';
import { NavLink, Route, Switch } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import useTitle from '../useTitle';
import ApiObjects from './api-objects';
import ForumOptIn from './forum-opt-in';
import Logs from './logs';
import Roles from './roles';
import Settings from './settings';

export default function Manage() {
  useTitle('Management');

  return (
    <>
      <nav className='nested'>
        <NavLink to='/admin/manage/roles'>Roles</NavLink>
        <NavLink to='/admin/manage/api-objects'>API objects</NavLink>
        <NavLink to='/admin/manage/logs'>Logs</NavLink>
        <NavLink to='/admin/manage/forum-opt-in'>Forum opt-in</NavLink>
        <NavLink to='/admin/manage/settings'>Site settings</NavLink>
      </nav>
      <Switch>
        <Route exact path='/admin/manage/roles'>
          <Roles />
        </Route>
        <ProtectedRoute exact path='/admin/manage/api-objects' role={Role.admin}>
          <ApiObjects />
        </ProtectedRoute>
        <Route exact path='/admin/manage/logs'>
          <Logs />
        </Route>
        <ProtectedRoute exact path='/admin/manage/forum-opt-in' role={Role.captain}>
          <ForumOptIn />
        </ProtectedRoute>
        <ProtectedRoute exact path='/admin/manage/settings' role={Role.captain}>
          <Settings />
        </ProtectedRoute>
      </Switch>
    </>
  );
}
