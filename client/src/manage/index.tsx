import { Role } from 'loved-bridge/tables';
import { NavLink, Route, Switch } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import useTitle from '../useTitle';
import ApiObjects from './api-objects';
import ClientKeyPage from './client-key/ClientKeyPage';
import ForumOptIn from './forum-opt-in';
import Logs from './logs';
import Roles from './roles';
import Settings from './settings';

export default function Manage() {
  useTitle('Management');

  return (
    <>
      <nav className='nested'>
        <NavLink to='/manage/roles'>Roles</NavLink>
        <NavLink to='/manage/api-objects'>API objects</NavLink>
        <NavLink to='/manage/logs'>Logs</NavLink>
        <NavLink to='/manage/forum-opt-in'>Forum opt-in</NavLink>
        <NavLink to='/manage/settings'>Site settings</NavLink>
        <NavLink to='/manage/client-key'>Client key</NavLink>
      </nav>
      <Switch>
        <Route exact path='/manage/roles'>
          <Roles />
        </Route>
        <ProtectedRoute exact path='/manage/api-objects' role={Role.admin}>
          <ApiObjects />
        </ProtectedRoute>
        <Route exact path='/manage/logs'>
          <Logs />
        </Route>
        <ProtectedRoute exact path='/manage/forum-opt-in' role={[Role.captain, Role.newsAuthor]}>
          <ForumOptIn />
        </ProtectedRoute>
        <ProtectedRoute exact path='/manage/settings' role={Role.captain}>
          <Settings />
        </ProtectedRoute>
        <ProtectedRoute exact path='/manage/client-key' role={Role.newsAuthor}>
          <ClientKeyPage />
        </ProtectedRoute>
      </Switch>
    </>
  );
}
