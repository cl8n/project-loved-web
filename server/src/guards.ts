import { createHash, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { accessSetting } from './settings';

const allRoles = ['alumni', 'captain', 'dev', 'metadata', 'moderator', 'news'] as const;

function isGod(method: string, user: AuthUser | undefined): boolean {
  return user != null && (user.roles.god || (method === 'GET' && user.roles.god_readonly));
}

function hasRole(method: string, user: AuthUser | undefined, roles: readonly Role[]): boolean {
  return user != null && (isGod(method, user) || roles.some((role) => user.roles[role]));
}

function hasRoleMiddleware(roles: readonly Role[], errorMessage: string): RequestHandler {
  return function (request, response, next) {
    if (!hasRole(request.method, response.typedLocals.user, roles)) {
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
  const key = request.get('X-Loved-InteropKey');

  if (request.get('X-Loved-InteropVersion') !== '2') {
    return response.status(422).json({ error: 'Unsupported program version' });
  }

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
  const user = response.typedLocals.user;

  if (gameMode == null) {
    return response.status(400).json({ error: 'No game mode provided' });
  }

  if (!isGod(request.method, user) && user?.roles.captain_game_mode !== gameMode) {
    return response.status(403).json({ error: `Must be a captain for mode ${gameMode}` });
  }

  next();
}

type RolesReturn = Record<typeof allRoles[number], boolean> & { gameModes: boolean[] };
export function roles(request: Request, response: Response): RolesReturn {
  const roles: Partial<RolesReturn> = {
    gameModes: [0, 1, 2, 3].map(
      (gameMode) =>
        isGod(request.method, response.typedLocals.user) ||
        response.typedLocals.user?.roles.captain_game_mode === gameMode,
    ),
  };

  for (const role of allRoles) {
    roles[role] = hasRole(request.method, response.typedLocals.user, [role]);
  }

  return roles as RolesReturn;
}

export const isAnything = hasRoleMiddleware(allRoles, 'Must have a role');
export const isCaptain = hasRoleMiddleware(['captain'], 'Must be a captain');
const isGodMiddleware = hasRoleMiddleware([], 'Must be God');
export { isGodMiddleware as isGod };
export const isMetadataChecker = hasRoleMiddleware(['metadata'], 'Must be a metadata checker');
export const isModerator = hasRoleMiddleware(['moderator'], 'Must be a moderator');
export const isNewsAuthor = hasRoleMiddleware(['news'], 'Must be a news author');
