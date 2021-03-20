import { GameMode, IRole, IUser } from './interfaces';

export function canReadAs(user: IUser, role: IRole | 'any') {
  if (role === 'any')
    return Object.values(user.roles).some((roleValue) => roleValue === true);

  return (
    user.roles.god ||
    user.roles.god_readonly ||
    user.roles[role]
  );
}

export function canWriteAs(user: IUser, role?: IRole): boolean;
export function canWriteAs(user: IUser, id?: number): boolean;
export function canWriteAs(user: IUser, roleOrId?: IRole | number) {
  return (
    user.roles.god ||
    (roleOrId != null &&
      (typeof roleOrId === 'number'
        ? user.id === roleOrId
        : user.roles[roleOrId]
      )
    )
  );
}

export function isCaptainForMode(user: IUser, gameMode: GameMode) {
  return (
    user.roles.god ||
    (user.roles.captain && user.roles.captain_game_mode === gameMode)
  );
}
