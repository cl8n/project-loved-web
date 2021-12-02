export function isAssigneeType(type: unknown): type is AssigneeType {
  return typeof type === 'number' && type >= 0 && type <= 1;
}

export function isGameMode(gameMode: unknown): gameMode is GameMode {
  return typeof gameMode === 'number' && gameMode >= 0 && gameMode <= 3;
}

export function isGameModeArray(gameModes: unknown): gameModes is GameMode[] {
  return Array.isArray(gameModes) && gameModes.every(isGameMode);
}

export function isNumberArray(numbers: unknown): numbers is number[] {
  return Array.isArray(numbers) && numbers.every((number) => typeof number === 'number');
}

export function isPollArray(polls: unknown): polls is {
  beatmapsetId: number;
  endedAt: string;
  gameMode: GameMode;
  roundId: number;
  startedAt: string;
  topicId: number;
}[] {
  return (
    Array.isArray(polls) &&
    polls.every(
      (poll) =>
        isRecord(poll) &&
        typeof poll.beatmapsetId === 'number' &&
        typeof poll.endedAt === 'string' &&
        isGameMode(poll.gameMode) &&
        typeof poll.roundId === 'number' &&
        typeof poll.startedAt === 'string' &&
        typeof poll.topicId === 'number',
    )
  );
}

export function isPollResultsArray(polls: unknown): polls is {
  id: number;
  no: number;
  yes: number;
}[] {
  return (
    Array.isArray(polls) &&
    polls.every(
      (poll) =>
        isRecord(poll) &&
        typeof poll.id === 'number' &&
        typeof poll.no === 'number' &&
        typeof poll.yes === 'number',
    )
  );
}

export function isRecord(record: unknown): record is Record<number | string, unknown> {
  return typeof record === 'object' && record != null;
}

export function isRepliesRecord(replies: unknown): replies is Record<GameMode, number> {
  return (
    isRecord(replies) &&
    Object.entries(replies).every(
      ([gameMode, postId]) => isGameMode(parseInt(gameMode, 10)) && typeof postId === 'number',
    )
  );
}

export function isRoleId(roleId: unknown): roleId is Role {
  return typeof roleId === 'number' && roleId >= 0 && roleId <= 7;
}

export function isStringArray(strings: unknown): strings is string[] {
  return Array.isArray(strings) && strings.every((string) => typeof string === 'string');
}

export function isUserRoleWithoutUserIdArray(roles: unknown): roles is Omit<UserRole, 'user_id'>[] {
  return (
    Array.isArray(roles) &&
    roles.every(
      (role) =>
        isRecord(role) &&
        (isGameMode(role.game_mode) || role.game_mode === -1) &&
        isRoleId(role.role_id) &&
        typeof role.alumni === 'boolean',
    )
  );
}
