import { apiErrorMessage, getUsersWithRoles, useApi } from '../../api';
import type { IUser, IUserRole } from '../../interfaces';
import { hasRole } from '../../permissions';
import { UserInline } from '../../UserInline';
import RolesList from './RolesList';
import UserAdder from './UserAdder';
import UserRolesEditor from './UserRolesEditor';

export default function UsersAndRolesList() {
  const [users, usersError, setUsers] = useApi(getUsersWithRoles);

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
      <UserAdder onUserAdd={onUserAdd} />
      <table>
        <tr>
          <th />
          <th>User</th>
          <th>Roles</th>
        </tr>
        {users.map((user) => (
          <tr key={user.id} className={hasRole(user, 'any') ? undefined : 'faded'}>
            <UserRolesEditor onRolesUpdate={onRolesUpdate(user.id)} user={user} />
            <td>
              <UserInline hideBannedLabel user={user} />
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
