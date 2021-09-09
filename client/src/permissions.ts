import type { GameMode, IRole, IUser } from './interfaces';

export function canReadAs(user: IUser, role: IRole | 'any') {
  if (role === 'any') return Object.values(user.roles).some((roleValue) => roleValue === true);

  return user.roles.god || user.roles.god_readonly || user.roles[role];
}

export function canWriteAs(user: IUser, ...rolesOrIds: (IRole | number)[]) {
  if (user.roles.god) return true;

  // TODO: This gives a very misleading UI that god_readonly can edit things,
  // but not worth the time to clean it up
  if (user.roles.god_readonly) return true;

  return rolesOrIds.some((roleOrId) => {
    return typeof roleOrId === 'number' ? user.id === roleOrId : user.roles[roleOrId];
  });
}

export function isCaptainForMode(user: IUser, gameMode: GameMode) {
  return user.roles.god || (user.roles.captain && user.roles.captain_game_mode === gameMode);
}
