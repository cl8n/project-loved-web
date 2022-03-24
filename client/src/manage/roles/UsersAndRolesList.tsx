import { apiErrorMessage, getUsersWithRoles, useApi } from '../../api';
import type { IUser, IUserRole } from '../../interfaces';
import { Never } from '../../Never';
import { useOsuAuth } from '../../osuAuth';
import { hasRole } from '../../permissions';
import { UserInline } from '../../UserInline';
import RolesList from './RolesList';
import UserAdder from './UserAdder';
import UserRolesEditor from './UserRolesEditor';

export default function UsersAndRolesList() {
  const authUser = useOsuAuth().user;
  const [users, usersError, setUsers] = useApi(getUsersWithRoles);

  if (authUser == null) {
    return <Never />;
  }

  if (usersError != null) {
    return <span className='panic'>Failed to load users: {apiErrorMessage(usersError)}</span>;
  }

  if (users == null) {
    return <span>Loading users...</span>;
  }

  const onRolesUpdate = (userId: number) => (userRoles: IUserRole[]) => {
    setUsers((prev) => {
      const users = [...prev!];
      users.find((user) => user.id === userId)!.roles = userRoles;
      return users;
    });
  };
  const onUserAdd = (user: IUser) => {
    setUsers((prev) => [{ ...user, roles: [] }, ...prev!]);
  };

  return (
    <>
      {hasRole(authUser, []) && <UserAdder onUserAdd={onUserAdd} />}
      <table>
        <tr>
          {hasRole(authUser, []) && <th />}
          <th>User</th>
          <th>Roles</th>
        </tr>
        {users.map((user) => (
          <tr key={user.id} className={hasRole(user, 'any') ? undefined : 'faded'}>
            {hasRole(authUser, []) && (
              <UserRolesEditor onRolesUpdate={onRolesUpdate(user.id)} user={user} />
            )}
            <td>
              <UserInline user={user} />
            </td>
            <td>
              <RolesList roles={user.roles} />
            </td>
          </tr>
        ))}
      </table>
    </>
  );
}
