import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import type {
  AssigneeType,
  Beatmapset,
  InteropKey,
  Log,
  LogType,
  MetadataState,
  ModeratorState,
  Role,
  Round,
  RoundGameMode,
  User,
} from 'loved-bridge/tables';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import type {
  ResponseError,
  Request as SuperAgentRequest,
  Response as SuperAgentResponse,
} from 'superagent';
import superagent from 'superagent';
import type {
  IMapperBeatmapsetConsent,
  IMapperConsent,
  INomination,
  INominationForPlanner,
  INominationWithPoll,
  IPoll,
  IReview,
  IRound,
  ISettings,
  ISubmission,
  IUser,
  IUserRole,
  IUserWithRoles,
  PartialWith,
  PartialWithId,
} from './interfaces';

interface SuperAgentResponseWithBody<BodyType> extends SuperAgentResponse {
  body: BodyType;
}
type Response<BodyType = undefined> = Promise<SuperAgentResponseWithBody<BodyType>> &
  SuperAgentRequest;

interface ApiObjectTypes {
  beatmapset: Beatmapset;
  user: IUser;
}
type ApiObjectType = keyof ApiObjectTypes;

export function isApiObjectType(type: string): type is ApiObjectType {
  return ['beatmapset', 'user'].includes(type);
}

export function addNomination(
  beatmapsetId: number,
  gameMode: GameMode,
  parentId: number | null,
  roundId: number,
): Response<INomination> {
  return superagent.post('/api/nomination-submit').send({
    beatmapsetId,
    gameMode,
    parentId,
    roundId,
  });
}

export function addOrUpdateInteropKey(): Response<InteropKey['key']> {
  return superagent.post('/api/interop-key');
}

export function addOrUpdateMapperConsent(
  consent: Pick<IMapperConsent, 'user_id' | 'consent' | 'consent_reason'>,
  consentBeatmapsets: Omit<IMapperBeatmapsetConsent, 'beatmapset' | 'user_id'>[],
): Response<IMapperConsent> {
  return superagent.post('/api/mapper-consent').send({ consent, consentBeatmapsets });
}

export function addOrUpdateReview(
  beatmapsetId: number,
  gameMode: GameMode,
  reason: string,
  score: number,
): Response<IReview> {
  return superagent.post('/api/review').send({ beatmapsetId, gameMode, reason, score });
}

export function addReviews(
  beatmapsetId: number,
  gameModes: GameMode[],
  reason: string,
  score: number,
): Response {
  return superagent.post('/api/review-many').send({ beatmapsetId, gameModes, reason, score });
}

export function addRound(): Response<{ id: number }> {
  return superagent.post('/api/add-round');
}

export function addUser(name: string, storeBanned?: boolean): Response<IUser> {
  return superagent.post('/api/add-user').send({ name, storeBanned });
}

export function authRemember(): Response<IUserWithRoles> {
  return superagent.get('/api/auth/remember');
}

export function deleteBeatmapset(beatmapsetId: number): Response {
  return superagent.delete('/api/beatmapset').query({ beatmapsetId });
}

export function deleteNomination(nominationId: number): Response {
  return superagent.delete('/api/nomination').query({ nominationId });
}

export function deleteReview(reviewId: number): Response {
  return superagent.delete('/api/review').query({ reviewId });
}

export function getAssigneeCandidates(): Response<Record<AssigneeType, IUser[]>> {
  return superagent.get('/api/assignee-candidates');
}

export function getCaptains(): Response<{ [P in GameMode]?: IUser[] }> {
  return superagent.get('/api/captains');
}

export function getCurrentNewsPost(): Response<{ roundName: string; url: string } | null> {
  return superagent.get('/api/current-news-post');
}

export function getHasExtraToken(): Response<boolean> {
  return superagent.get('/api/has-extra-token');
}

export function getInteropKey(): Response<InteropKey['key'] | null> {
  return superagent.get('/api/interop-key');
}

export function getNewsAuthors(): Response<IUser[]> {
  return superagent.get('/api/news-authors');
}

export function getNominations(roundId: number): Response<{
  nominations: INominationWithPoll[];
  round: IRound & {
    hide_nomination_status?: ISettings['hideNominationStatus'];
    news_author: IUser;
  };
}> {
  return superagent.get('/api/nominations').query({ roundId });
}

export function getNominationsForPlanner(gameMode: GameMode): Response<{
  nominations: INominationForPlanner[];
  submissionUsersById: Record<number, User>;
} | null> {
  return superagent.get('/api/planner').query({ gameMode });
}

export function getOnlineUsers(): Response<{ guestCount: number; users: User[] }> {
  return superagent.get('/api/online');
}

export function getPolls(): Response<IPoll[]> {
  return superagent.get('/api/stats/polls');
}

interface GetRoundsResponseBody {
  complete_rounds: (IRound & { nomination_count: number })[];
  incomplete_rounds: (IRound & { nomination_count: number })[];
}

export function getRounds(): Response<GetRoundsResponseBody> {
  return superagent.get('/api/rounds');
}

export function getSettings(): Response<ISettings> {
  return superagent.get('/api/settings');
}

export function getLogs(
  types: LogType[],
  page: number,
): Response<{ logs: Log[]; pageSize: number; total: number }> {
  return superagent.post('/api/logs').send({ page, types });
}

export interface GetSubmissionsResponseBody {
  beatmapsets: (Beatmapset & {
    beatmap_counts: Record<GameMode, number>;
    consent: boolean | null;
    key_modes: number[];
    low_favorites: boolean;
    maximum_length: number;
    modal_bpm: number;
    nominated_round_name?: string | null;
    play_count_recalculated: boolean;
    poll?: {
      in_progress: boolean;
      passed: boolean;
      topic_id: number;
    };
    review_score: number;
    review_score_all: number;
    reviews: IReview[];
    score: number;
    strictly_rejected: boolean;
    submissions: ISubmission[];
  })[];
  usersById: Record<number, IUser>;
}

export function getSubmissions(gameMode: GameMode): Response<GetSubmissionsResponseBody> {
  return superagent.get('/api/submissions').query({ gameMode });
}

export type GetTeamResponseBody = Record<
  'alumni' | 'current',
  Partial<Record<Role, Partial<Record<GameMode | -1, IUser[]>>>>
>;

export function getTeam(): Response<GetTeamResponseBody> {
  return superagent.get('/api/team');
}

export function getUsersWithRoles(): Response<IUserWithRoles[]> {
  return superagent.get('/api/users-with-permissions');
}

export function getMapperConsents(): Response<IMapperConsent[]> {
  return superagent.get('/api/mapper-consents');
}

export function lockNominations(roundId: number, gameMode: GameMode, lock: boolean): Response {
  return superagent.post('/api/lock-nominations').send({ roundId, gameMode, lock });
}

export function markPackUploaded(roundId: number): Response<PartialWithId<Round>> {
  return superagent.post('/api/mark-pack-uploaded').query({ roundId });
}

export function searchBeatmapsets(query: string): Response<Beatmapset[]> {
  return superagent.get('/api/search-beatmapset').query({ query });
}

export function updateApiObject<T extends ApiObjectType>(type: T, id: number): Response {
  return superagent.post('/api/update-api-object').send({ type, id });
}

export function updateApiObjectBulk<T extends ApiObjectType>(type: T, ids: number[]): Response {
  return superagent.post('/api/update-api-object-bulk').send({ type, ids });
}

export function updateExcludedBeatmaps(
  nominationId: number,
  excludedBeatmapIds: number[],
): Response<PartialWithId<INomination>> {
  return superagent
    .post('/api/update-excluded-beatmaps')
    .send({ nominationId, excludedBeatmapIds });
}

export function updateNominationAssignees(
  nominationId: number,
  type: AssigneeType,
  assigneeIds: number[],
): Response<PartialWithId<INomination>> {
  return superagent
    .post('/api/update-nomination-assignees')
    .send({ nominationId, type, assigneeIds });
}

export function updateNominationDescription(
  nominationId: number,
  description: string | null,
): Response<PartialWithId<INomination>> {
  return superagent.post('/api/nomination-edit-description').send({ description, nominationId });
}

export function updateNominationMetadata(
  nominationId: number,
  state: MetadataState,
  artist: string | null,
  title: string | null,
  creators: IUser[] | undefined,
): Response<PartialWithId<INomination>> {
  return superagent
    .post('/api/nomination-edit-metadata')
    .send({ artist, creators, nominationId, state, title });
}

export function updateNominationModeration(
  nominationId: number,
  state: ModeratorState,
): Response<PartialWithId<INomination>> {
  return superagent.post('/api/nomination-edit-moderation').send({ nominationId, state });
}

export function updateNominationOrder(orders: Record<number, number>): Response {
  return superagent.post('/api/update-nomination-order').send(orders);
}

export function updateNominators(
  nominationId: number,
  nominatorIds: number[],
): Response<PartialWithId<INomination>> {
  return superagent.post('/api/update-nominators').send({ nominationId, nominatorIds });
}

export function updateRound(
  roundId: number,
  round: Partial<Readonly<Round>>,
  roundGameModes: readonly PartialWith<Readonly<RoundGameMode>, 'game_mode'>[],
): Response<IRound & { news_author: IUser }> {
  return superagent.post('/api/update-round').send({ round, roundGameModes, roundId });
}

export function updateSettings(settings: ISettings): Response<ISettings> {
  return superagent.put('/api/settings').send(settings);
}

export function updateUserRoles(
  userId: number,
  roles: readonly Omit<IUserRole, 'user_id'>[],
): Response {
  return superagent.post('/api/update-permissions').send({
    roles,
    userId,
  });
}

export function alertApiErrorMessage(error: ResponseError): void {
  window.alert(apiErrorMessage(error)); // TODO: show error better
}

export function apiErrorMessage(error: ResponseError): string {
  return error.response?.body?.error ?? error.message;
}

export type useApiReturn<T> = [
  T | undefined,
  ResponseError | undefined,
  Dispatch<SetStateAction<T | undefined>>,
];

export function useApi<T>(requester: () => Response<T>): useApiReturn<T>;
export function useApi<T, P extends unknown[]>(
  requester: (...args: P) => Response<T>,
  args: P,
  options?: {
    condition?: boolean;
  },
): useApiReturn<T>;
export function useApi<T, T2, P extends unknown[]>(
  requester: (...args: P) => Response<T>,
  args: P,
  options: {
    transform: (body: T) => T2;
    condition?: boolean;
  },
): useApiReturn<T2>;
export function useApi<T, T2, P extends unknown[]>(
  requester: (() => Response<T>) | ((...args: P) => Response<T>),
  args?: P,
  options?: { transform?: (body: T) => T2; condition?: boolean },
): useApiReturn<T | T2> {
  const [body, setBody] = useState<T | T2>();
  const [error, setError] = useState<ResponseError>();

  useEffect(
    () => {
      setBody(undefined);
      setError(undefined);

      if (options?.condition === false) {
        return;
      }

      (args == null ? requester() : requester(...args))
        .then(({ body }) => setBody(options?.transform == null ? body : options.transform(body)))
        .catch(setError);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    args == null ? [options?.condition] : [options?.condition, ...args],
  );

  return [body, error, setBody];
}
