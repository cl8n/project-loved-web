import { Role } from 'loved-bridge/tables';
import type { GameMode, IUserWithRoles } from './interfaces';

export const allRoles = Object.values(Role).filter(
  (roleEnumKey) => typeof roleEnumKey === 'number',
) as Role[];

// TODO: Translatable
export const roleNames = {
  [Role.admin]: 'Admin',
  [Role.captain]: 'Captain',
  [Role.metadata]: 'Metadata reviewer',
  [Role.moderator]: 'Moderator',
  [Role.news]: 'News editor / Manager',
  [Role.developer]: 'Developer',
  [Role.spectator]: 'Spectator',
  [Role.video]: 'Video editor',
} as const;

function hasRole(user: Readonly<IUserWithRoles>, roleIds: readonly Role[]): boolean {
  return roleIds.some((roleId) =>
    user.roles.some((role) => !role.alumni && role.role_id === roleId),
  );
}

function hasRoleForGameMode(
  user: Readonly<IUserWithRoles>,
  roleId: Role,
  gameMode: GameMode,
): boolean {
  return user.roles.some(
    (role) => !role.alumni && role.role_id === roleId && role.game_mode === gameMode,
  );
}

// TODO: This gives a very misleading UI that spectators can edit things,
// but not worth the time to clean it up
function isAdmin(user: Readonly<IUserWithRoles>): boolean {
  return hasRole(user, [Role.admin, Role.spectator]);
}

function hasRoleExport(
  user: Readonly<IUserWithRoles>,
  roleId: Role | readonly Role[] | 'any',
  gameMode?: GameMode,
  skipAdminCheck?: boolean,
): boolean {
  if (roleId === 'any') {
    return hasRole(user, allRoles);
  }

  if (!skipAdminCheck && isAdmin(user)) {
    return true;
  }

  if (typeof roleId === 'number') {
    return gameMode == null ? hasRole(user, [roleId]) : hasRoleForGameMode(user, roleId, gameMode);
  }

  return hasRole(user, roleId);
}
export { hasRoleExport as hasRole };

export function canActAs(user: Readonly<IUserWithRoles>, userIds: readonly number[]): boolean {
  return isAdmin(user) || userIds.some((id) => user.id === id);
}
