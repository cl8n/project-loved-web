import { createHash, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { accessSetting } from './settings';

const normalRoles = [
  Role.captain,
  Role.metadata,
  Role.moderator,
  Role.news,
  Role.developer,
  Role.video,
] as const;

function findRole(user: Readonly<UserWithRoles>, roleId: Role): UserRole | undefined {
  return user.roles.find((role) => !role.alumni && role.role_id === roleId);
}

export function hasRole(user: Readonly<UserWithRoles>, roleIds: readonly Role[]): boolean {
  return roleIds.some((roleId) => findRole(user, roleId) != null);
}

export function hasRoleOrAdmin(
  user: Readonly<UserWithRoles>,
  roleIds: readonly Role[],
  method: string,
): boolean {
  return isAdmin(user, method) || hasRole(user, roleIds);
}

export function hasRoleForGameModeOrAdmin(
  user: Readonly<UserWithRoles>,
  roleId: Role,
  gameMode: GameMode,
  method: string,
): boolean {
  return isAdmin(user, method) || findRole(user, roleId)?.game_mode === gameMode;
}

function isAdmin(user: Readonly<UserWithRoles>, method: string): boolean {
  return hasRole(user, [Role.admin]) || (method === 'GET' && hasRole(user, [Role.spectator]));
}

function hasRoleMiddleware(roleIds: readonly Role[], errorMessage: string): RequestHandler {
  return function (request, response, next) {
    if (!hasRoleOrAdmin(response.typedLocals.user, roleIds, request.method)) {
      return response.status(403).json({ error: errorMessage });
    }

    next();
  };
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();

  return timingSafeEqual(aHash, bHash);
}

export function hasLocalInteropKey(
  request: Request,
  response: Response,
  next: NextFunction,
): unknown {
  if (
    process.env.INTEROP_VERSION == null ||
    request.get('X-Loved-InteropVersion') !== process.env.INTEROP_VERSION
  ) {
    return response.status(422).json({ error: 'Unsupported program version' });
  }

  const key = request.get('X-Loved-InteropKey');

  if (key == null) {
    return response.status(422).json({ error: 'Missing key' });
  }

  if (!timingSafeStringEqual(accessSetting('localInteropSecret'), key)) {
    return response.status(401).json({ error: 'Invalid key' });
  }

  next();
}

export function isCaptainForGameMode(
  request: Request,
  response: Response,
  next: NextFunction,
): unknown {
  const gameMode = parseInt(request.param('gameMode'), 10);

  if (gameMode == null) {
    return response.status(400).json({ error: 'No game mode provided' });
  }

  if (
    !hasRoleForGameModeOrAdmin(response.typedLocals.user, Role.captain, gameMode, request.method)
  ) {
    return response.status(403).json({ error: `Must be a captain for mode ${gameMode}` });
  }

  next();
}

const isAdminMiddleware = hasRoleMiddleware([], 'Must be an admin');
export { isAdminMiddleware as isAdmin };
export const isAnything = hasRoleMiddleware(normalRoles, 'Must have a role');
export const isCaptain = hasRoleMiddleware([Role.captain], 'Must be a captain');
export const isMetadataChecker = hasRoleMiddleware([Role.metadata], 'Must be a metadata checker');
export const isModerator = hasRoleMiddleware([Role.moderator], 'Must be a moderator');
export const isNewsAuthor = hasRoleMiddleware([Role.news], 'Must be a news author');
