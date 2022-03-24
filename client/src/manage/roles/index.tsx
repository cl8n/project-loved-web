import useTitle from '../../useTitle';
import UsersAndRolesList from './UsersAndRolesList';

export default function Roles() {
  useTitle('Roles');

  return (
    <>
      <h1>Roles</h1>
      <UsersAndRolesList />
    </>
  );
}
