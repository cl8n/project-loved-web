import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import type {
  AssigneeType,
  Consent,
  ConsentBeatmapset,
  ConsentValue,
  Role,
  UserRole,
} from 'loved-bridge/tables';
import type { ResponseError } from 'superagent';

export function isAssigneeType(type: unknown): type is AssigneeType {
  return isInteger(type) && type >= 0 && type <= 1;
}

export function isConsentValue(consent: unknown): consent is ConsentValue | null {
  // Checking for exactly null to validate input
  // eslint-disable-next-line eqeqeq
  return consent === null || (isInteger(consent) && consent >= 0 && consent <= 2);
}

export function isGameMode(gameMode: unknown): gameMode is GameMode {
  return isInteger(gameMode) && gameMode >= 0 && gameMode <= 3;
}

export function isGameModeArray(gameModes: unknown): gameModes is GameMode[] {
  return Array.isArray(gameModes) && gameModes.every(isGameMode);
}

/**
 * The type guard on this is intentionally not correct when `integer` is of type number but not an
 * integer. Only use it when such inputs would not be referred to later.
 */
export function isInteger(integer: unknown): integer is number {
  return Number.isSafeInteger(integer);
}

export function isIntegerArray(integers: unknown): integers is number[] {
  return Array.isArray(integers) && integers.every(isInteger);
}

export function isMapperConsent(
  consent: unknown,
): consent is Pick<Consent, 'consent' | 'consent_reason' | 'user_id'> {
  return (
    isRecord(consent) &&
    isConsentValue(consent.consent) &&
    // Checking for exactly null to validate input
    // eslint-disable-next-line eqeqeq
    (consent.consent_reason === null || typeof consent.consent_reason === 'string') &&
    isInteger(consent.user_id)
  );
}

export function isMapperConsentBeatmapsetArray(
  beatmapsets: unknown,
): beatmapsets is Pick<ConsentBeatmapset, 'beatmapset_id' | 'consent' | 'consent_reason'>[] {
  return (
    Array.isArray(beatmapsets) &&
    beatmapsets.every(
      (beatmapset) =>
        isRecord(beatmapset) &&
        isInteger(beatmapset.beatmapset_id) &&
        typeof beatmapset.consent === 'boolean' &&
        // Checking for exactly null to validate input
        // eslint-disable-next-line eqeqeq
        (beatmapset.consent_reason === null || typeof beatmapset.consent_reason === 'string'),
    )
  );
}

export function isNewsRequestBody(body: unknown): body is {
  mainTopicBodies: Partial<Record<GameMode, string>>;
  nominationTopicBodies: Record<number, string>;
  roundId: number;
} {
  return (
    isRecord(body) &&
    isRecord(body.mainTopicBodies) &&
    Object.entries(body.mainTopicBodies).every(
      ([key, value]) => isGameMode(parseInt(key, 10)) && typeof value === 'string',
    ) &&
    isRecord(body.nominationTopicBodies) &&
    Object.entries(body.nominationTopicBodies).every(
      ([key, value]) => !isNaN(parseInt(key, 10)) && typeof value === 'string',
    ) &&
    isInteger(body.roundId)
  );
}

export function isRecord(record: unknown): record is Record<number | string, unknown> {
  return typeof record === 'object' && record != null;
}

export function isResponseError(error: unknown): error is ResponseError {
  return isRecord(error) && error.response != null && isInteger(error.status);
}

export function isResultsRequestBody(body: unknown): body is {
  mainTopicIds: Partial<Record<GameMode, number>>;
  roundId: number;
} {
  return (
    isRecord(body) &&
    isRecord(body.mainTopicIds) &&
    Object.entries(body.mainTopicIds).every(
      ([key, value]) => isGameMode(parseInt(key, 10)) && isInteger(value),
    ) &&
    isInteger(body.roundId)
  );
}

export function isRoleId(roleId: unknown): roleId is Role {
  return isInteger(roleId) && roleId >= 0 && roleId <= 8;
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
