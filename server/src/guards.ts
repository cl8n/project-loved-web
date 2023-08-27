import type { Request, RequestHandler, Response } from 'express';
import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import type { UserRole } from 'loved-bridge/tables';
import { Role } from 'loved-bridge/tables';
import config from './config.js';
import db from './db.js';
import { asyncHandler } from './express-helpers.js';

const normalRoles = [
  Role.captain,
  Role.metadata,
  Role.moderator,
  Role.newsEditor,
  Role.developer,
  Role.video,
  Role.newsAuthor,
] as const;

function hasRole(user: Readonly<UserWithRoles>, roleIds: readonly Role[]): boolean {
  return roleIds.some((roleId) =>
    user.roles.some((role) => !role.alumni && role.role_id === roleId),
  );
}

function hasRoleForGameMode(
  user: Readonly<UserWithRoles>,
  roleId: Role,
  gameMode: GameMode,
): boolean {
  return user.roles.some(
    (role) => !role.alumni && role.role_id === roleId && role.game_mode === gameMode,
  );
}

function isAdmin(user: Readonly<UserWithRoles>, method: string): boolean {
  return hasRole(user, [Role.admin]) || (method === 'GET' && hasRole(user, [Role.spectator]));
}

function hasRoleMiddleware(roleIds: readonly Role[], errorMessage: string): RequestHandler {
  return function (request, response, next) {
    const user = response.typedLocals.user as UserWithRoles | undefined;

    if (user == null) {
      return response.status(401).json({ error: errorMessage });
    }

    if (!isAdmin(user, request.method) && !hasRole(user, roleIds)) {
      return response.status(403).json({ error: errorMessage });
    }

    next();
  };
}

export const hasLocalInteropKeyMiddleware = asyncHandler(async (request, response, next) => {
  if (request.get('X-Loved-InteropVersion') !== '7') {
    return response.status(422).json({ error: 'Unsupported program version' });
  }

  const key = request.get('X-Loved-InteropKey');

  if (key == null) {
    return response.status(422).json({ error: 'Missing key' });
  }

  const interopUser = await db.queryOne<UserWithRoles>(
    `
      SELECT users.*
      FROM interop_keys
      INNER JOIN users
        ON interop_keys.user_id = users.id
      WHERE interop_keys.key = ?
    `,
    [key],
  );

  if (interopUser == null) {
    return response.status(401).json({ error: 'Invalid key' });
  }

  interopUser.roles = await db.query<UserRole>('SELECT * FROM user_roles WHERE user_id = ?', [
    interopUser.id,
  ]);
  response.typedLocals.user = interopUser;

  next();
});

export function currentUserRoles(
  request: Request,
  response: Response,
): (
  roleId: Role | readonly Role[] | 'any',
  gameMode?: GameMode,
  skipAdminCheck?: boolean,
) => boolean {
  const user = response.typedLocals.user as UserWithRoles | undefined;

  return (roleId, gameMode, skipAdminCheck) => {
    if (user == null) {
      return false;
    }

    if (roleId === 'any') {
      return hasRole(user, normalRoles);
    }

    if (!skipAdminCheck && isAdmin(user, request.method)) {
      return true;
    }

    if (typeof roleId === 'number') {
      return gameMode == null
        ? hasRole(user, [roleId])
        : hasRoleForGameMode(user, roleId, gameMode);
    }

    return hasRole(user, roleId);
  };
}

export const isAdminMiddleware = hasRoleMiddleware([], 'Must be an admin');
export const isAnyRoleMiddleware = hasRoleMiddleware(normalRoles, 'Must have a role');
export const isCaptainMiddleware = hasRoleMiddleware([Role.captain], 'Must be a captain');
export const isModeratorMiddleware = hasRoleMiddleware([Role.moderator], 'Must be a moderator');
export const isNewsAuthorMiddleware = hasRoleMiddleware([Role.newsAuthor], 'Must be a news author');
