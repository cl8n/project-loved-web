import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import superagent, { Response as SuperAgentResponse, ResponseError } from 'superagent';
import { GameMode, IBeatmapset, ICaptain, ILog, INomination, IRound, IUser, MetadataState, PartialWithId } from './interfaces';

interface SuperAgentResponseWithBody<BodyType> extends SuperAgentResponse {
  body: BodyType;
}
type Response<BodyType = undefined> = Promise<SuperAgentResponseWithBody<BodyType>>;

type ApiObjectTypes = {
  beatmapset: IBeatmapset;
  user: IUser;
};
type ApiObjectType = keyof ApiObjectTypes;

export function isApiObjectType(type: any): type is ApiObjectType {
  return ['beatmapset', 'user'].includes(type);
}

export function addNomination(beatmapsetId: number, gameMode: GameMode, parentId: number | null, roundId: number): Response<INomination> {
  return superagent
    .post('/api/nomination-submit')
    .send({
      beatmapsetId,
      gameMode,
      parentId,
      roundId,
    });
}

export function addRound(name: string, newsPostAt: Date): Response<IRound> {
  return superagent
    .post('/api/add-round')
    .send({
      name,
      news_posted_at: newsPostAt,
    });
}

export function addUser(name: string): Response<IUser> {
  return superagent
    .post('/api/add-user')
    .send({ name });
}

export function deleteNomination(nominationId: number): Response {
  return superagent
    .delete('/api/nomination')
    .query({ nominationId });
}

export function getAssignees(): Response<{ metadatas: IUser[]; moderators: IUser[]; }> {
  return superagent
    .get('/api/assignees');
}

export function getCaptains(): Response<ICaptain[]> {
  return superagent
    .get('/api/captains');
}

export function getNominations(roundId: number): Response<{ nominations: INomination[]; round: IRound; }> {
  return superagent
    .get('/api/nominations')
    .query({ roundId });
}

export function getRounds(): Response<(IRound & { nomination_count: number; })[]> {
  return superagent
    .get('/api/rounds');
}

//#region Manage
export function getLogs(): Response<ILog[]> {
  return superagent
    .get('/api/logs');
}

export function getUsersWithRoles(): Response<IUser[]> {
  return superagent
    .get('/api/users-with-permissions');
}

export function updateApiObject<T extends ApiObjectType>(type: T, id: number): Response<ApiObjectTypes[T]> {
  return superagent
    .post('/api/update-api-object')
    .send({ type, id });
}

export function updateExcludedBeatmaps(nominationId: number, excludedBeatmapIds: number[]): Response {
  return superagent
    .post('/api/update-excluded-beatmaps')
    .send({ nominationId, excludedBeatmapIds });
}

export function updateNominationDescription(nominationId: number, description: string | null): Response<PartialWithId<INomination>> {
  return superagent
    .post('/api/nomination-edit-description')
    .send({ description, nominationId });
}

export function updateNominationMetadata(nominationId: number, state: MetadataState, artist: string | null, title: string | null): Response<PartialWithId<INomination>> {
  return superagent
    .post('/api/nomination-edit-metadata')
    .send({ artist, nominationId, state, title });
}

export function updateMetadataAssignee(nominationId: number, assigneeId: number | null): Response<PartialWithId<INomination>> {
  return superagent
    .post('/api/update-metadata-assignee')
    .send({ assigneeId, nominationId });
}

export function updateModeratorAssignee(nominationId: number, assigneeId: number | null): Response<PartialWithId<INomination>> {
  return superagent
    .post('/api/update-moderator-assignee')
    .send({ assigneeId, nominationId });
}

export function updateUserRoles(userId: number, roles: IUser['roles']): Response {
  return superagent
    .post('/api/update-permissions')
    .send({
      userId,
      ...roles,
      captain_game_mode: roles.captain_game_mode ?? null,
    });
}
//#endregion

export function apiErrorMessage(error: ResponseError): string {
  return error.response?.body.error ?? error.message;
}

type useApiReturn<T> = [T | undefined, Error | undefined, Dispatch<SetStateAction<T | undefined>>];

export function useApi<T>(requester: () => Response<T>): useApiReturn<T>;
export function useApi<T, P extends unknown[]>(requester: (...args: P) => Response<T>, args: P, transform?: (body: T) => T, condition?: boolean): useApiReturn<T>;
export function useApi<T, P extends unknown[]>(requester: (...args: P) => Response<T>, args?: P, transform?: (body: T) => T, condition?: boolean): useApiReturn<T> {
  const [body, setBody] = useState<T>();
  const [error, setError] = useState<ResponseError>();

  useEffect(() => {
    if (condition === false) {
      setBody(undefined);
      setError(undefined);

      return;
    }

    (args == null ? requester(...[] as any) : requester(...args))
      .then((response) => setBody(transform == null ? response.body : transform(response.body)))
      .catch((error) => setError(error));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, args == null ? [condition, requester] : [...args, condition, requester]);

  return [body, error, setBody];
}
