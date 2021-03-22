import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import superagent, { Response as SuperAgentResponse, ResponseError } from 'superagent';
import { GameMode, IBeatmapset, ICaptain, ILog, INomination, IRound, IUser, MetadataState, PartialWithId } from './interfaces';

interface Response<BodyType = undefined> extends SuperAgentResponse {
  body: BodyType;
}

type AddNominationResponse = Promise<Response<INomination>>;
type AddRoundResponse = Promise<Response<IRound>>;
type AddUserResponse = Promise<Response<IUser>>;
type DeleteNominationResponse = Promise<Response>;
type GetAssigneesResponse = Promise<Response<{
  metadatas: IUser[];
  moderators: IUser[];
}>>;
type GetCaptainsResponse = Promise<Response<ICaptain[]>>;
type GetNominationsResponse  = Promise<Response<{
  nominations: INomination[];
  round: IRound;
}>>;
type GetRoundsResponse = Promise<Response<(IRound & { nomination_count: number; })[]>>;
type GetLogsResponse = Promise<Response<ILog[]>>;
type GetUsersWithRolesResponse = Promise<Response<IUser[]>>;
type UpdateApiObjectResponse<T extends ApiObjectType> = Promise<Response<ApiObjectTypes[T]>>;
type UpdateNominationDescriptionResponse = Promise<Response<PartialWithId<INomination>>>;
type UpdateNominationMetadataResponse = Promise<Response<PartialWithId<INomination>>>;
type UpdateMetadataAssigneeResponse = Promise<Response<PartialWithId<INomination>>>;
type UpdateModeratorAssigneeResponse = Promise<Response<PartialWithId<INomination>>>;
type UpdateUserRolesResponse = Promise<Response>;

type ApiObjectTypes = {
  beatmapset: IBeatmapset;
  user: IUser;
};
type ApiObjectType = keyof ApiObjectTypes;

export function isApiObjectType(type: any): type is ApiObjectType {
  return ['beatmapset', 'user'].includes(type);
}

export function addNomination(beatmapsetId: number, gameMode: GameMode, parentId: number | undefined, roundId: number): AddNominationResponse {
  return superagent
    .post('/api/nomination-submit')
    .send({
      beatmapsetId,
      gameMode,
      parentId: parentId ?? null,
      roundId,
    });
}

export function addRound(name: string, newsPostAt: Date): AddRoundResponse {
  return superagent
    .post('/api/add-round')
    .send({
      name,
      news_posted_at: newsPostAt,
    });
}

export function addUser(name: string): AddUserResponse {
  return superagent
    .post('/api/add-user')
    .send({ name });
}

export function deleteNomination(nominationId: number): DeleteNominationResponse {
  return superagent
    .delete('/api/nomination')
    .query({ nominationId });
}

export function getAssignees(): GetAssigneesResponse {
  return superagent
    .get('/api/assignees');
}

export function getCaptains(): GetCaptainsResponse {
  return superagent
    .get('/api/captains');
}

export function getNominations(roundId: number): GetNominationsResponse {
  return superagent
    .get('/api/nominations')
    .query({ roundId });
}

export function getRounds(): GetRoundsResponse {
  return superagent
    .get('/api/rounds');
}

//#region Manage
export function getLogs(): GetLogsResponse {
  return superagent
    .get('/api/logs');
}

export function getUsersWithRoles(): GetUsersWithRolesResponse {
  return superagent
    .get('/api/users-with-permissions');
}

export function updateApiObject<T extends ApiObjectType>(type: T, id: number): UpdateApiObjectResponse<T> {
  return superagent
    .post('/api/update-api-object')
    .send({ type, id });
}

export function updateNominationDescription(nominationId: number, description: string | null): UpdateNominationDescriptionResponse {
  return superagent
    .post('/api/nomination-edit-description')
    .send({ description, nominationId });
}

export function updateNominationMetadata(nominationId: number, state: MetadataState, artist: string | null, title: string | null): UpdateNominationMetadataResponse {
  return superagent
    .post('/api/nomination-edit-metadata')
    .send({ artist, nominationId, state, title });
}

export function updateMetadataAssignee(nominationId: number, assigneeId: number | null): UpdateMetadataAssigneeResponse {
  return superagent
    .post('/api/update-metadata-assignee')
    .send({ assigneeId, nominationId });
}

export function updateModeratorAssignee(nominationId: number, assigneeId: number | null): UpdateModeratorAssigneeResponse {
  return superagent
    .post('/api/update-moderator-assignee')
    .send({ assigneeId, nominationId });
}

export function updateUserRoles(userId: number, roles: IUser['roles']): UpdateUserRolesResponse {
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

export function useApi<T>(requester: () => Promise<Response<T>>): useApiReturn<T>;
export function useApi<T, P extends unknown[]>(requester: (...args: P) => Promise<Response<T>>, args: P, transform?: (body: T) => T, condition?: boolean): useApiReturn<T>;
export function useApi<T, P extends unknown[]>(requester: (...args: P) => Promise<Response<T>>, args?: P, transform?: (body: T) => T, condition?: boolean) {
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
