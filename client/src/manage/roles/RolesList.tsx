import { gameModeLongName } from 'loved-bridge/beatmaps/gameMode';
import { Role } from 'loved-bridge/tables';
import type { IUserRole } from '../../interfaces';
import ListInline from '../../ListInline';
import { roleNames } from '../../permissions';

export function renderRole(role: IUserRole) {
  const classNames: string[] = [];

  if (role.role_id === Role.captain) {
    classNames.push('secondary-accent');
  }

  if (role.alumni) {
    classNames.push('faded');
  }

  return (
    <span className={classNames.join(' ')}>
      {roleNames[role.role_id]}
      {role.game_mode !== -1 && ` (${gameModeLongName(role.game_mode)})`}
      {role.alumni && ' (alumni)'}
    </span>
  );
}

interface RolesListProps {
  roles: IUserRole[];
}

export default function RolesList({ roles }: RolesListProps) {
  return <ListInline array={roles} render={renderRole} onlyCommas />;
}
