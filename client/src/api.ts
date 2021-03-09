import { useEffect, useState } from 'react';
import superagent, { Response as SuperAgentResponse } from 'superagent';
import { IBeatmapset, ICaptain, ILog, INomination, IRound, IUser } from './interfaces';

interface Response<BodyType> extends SuperAgentResponse {
  body: BodyType;
}

type GetCaptainsResponse = Promise<Response<ICaptain[]>>;
type GetNominationsResponse  = Promise<Response<{
  nominations: INomination[];
  round: IRound;
}>>;
type GetRoundsResponse = Promise<Response<IRound[]>>;
type GetLogsResponse = Promise<Response<ILog[]>>;
type GetUsersWithRolesResponse = Promise<Response<IUser[]>>;
type UpdateApiObjectResponse<T extends ApiObjectType> = Promise<Response<ApiObjectTypes[T]>>;
type UpdateUserRolesResponse = Promise<Response<undefined>>;

type ApiObjectTypes = {
  beatmapset: IBeatmapset;
  user: IUser;
};
type ApiObjectType = keyof ApiObjectTypes;

export function isApiObjectType(type: any): type is ApiObjectType {
  return ['beatmapset', 'user'].includes(type);
}

export function getCaptains(): GetCaptainsResponse {
  return superagent
    .get('/api/captains');
}

export function getNominations(roundId: number): GetNominationsResponse {
  return superagent
    .get('/api/nominations')
    .query({ round_id: roundId });
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

export function updateUserRoles(userId: number, roles: Partial<IUser['roles']>): UpdateUserRolesResponse {
  return superagent
    .post('/api/update-permissions')
    .send({
      userId,
      ...roles,
    });
}
//#endregion

export function useApi<T>(requester: () => Promise<Response<T>>) {
  const [body, setBody] = useState<T>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    requester()
      .then((response) => setBody(response.body))
      .catch((error) => setError(error));
  }, [requester]);

  return [body, error, setBody] as const;
}
