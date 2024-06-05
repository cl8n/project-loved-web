import { GameMode } from 'loved-bridge/beatmaps/gameMode';
import type { AssigneeType, Consent, ConsentBeatmapset, UserRole } from 'loved-bridge/tables';
import { ConsentValue, LogType, Role } from 'loved-bridge/tables';
import type { ResponseError } from 'superagent';

function isNumericEnumValue(
  enumObject: Record<string, number | string>,
  enumValue: unknown,
): boolean {
  return (
    typeof enumValue === 'number' && Object.values(enumObject).some((value) => value === enumValue)
  );
}

export function isAssigneeType(type: unknown): type is AssigneeType {
  return type === 'metadata' || type === 'moderator' || type === 'news_editor';
}

export function isConsentValue(consent: unknown): consent is ConsentValue | null {
  // Checking for exactly null to validate input
  // eslint-disable-next-line eqeqeq
  return consent === null || isNumericEnumValue(ConsentValue, consent);
}

export function isGameMode(gameMode: unknown): gameMode is GameMode {
  return isNumericEnumValue(GameMode, gameMode);
}

export function isGameModeArray(gameModes: unknown): gameModes is GameMode[] {
  return Array.isArray(gameModes) && gameModes.every(isGameMode);
}

export function isIdString(id: string): boolean {
  return /^\d+$/.test(id);
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

export function isLogType(type: unknown): type is LogType {
  return isNumericEnumValue(LogType, type);
}

export function isLogTypeArray(types: unknown): types is LogType[] {
  return Array.isArray(types) && types.every(isLogType);
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

export function isRecordArray(records: unknown): records is Record<number | string, unknown>[] {
  return Array.isArray(records) && records.every(isRecord);
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
  return isNumericEnumValue(Role, roleId);
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
