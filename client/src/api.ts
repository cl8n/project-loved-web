import superagent from 'superagent';
import { IUser } from './interfaces';

export function getNominations(roundId: number) {
  return superagent
    .get('/api/nominations')
    .query({ round_id: roundId });
}

export function getRounds() {
  return superagent
    .get('/api/rounds');
}

//#region Manage
export function getLogs() {
  return superagent
    .get('/api/logs');
}

export function getUsersWithRoles() {
  return superagent
    .get('/api/users-with-permissions');
}

export function updateApiObject(type: string, id: number) {
  return superagent
    .post('/api/update-api-object')
    .send({ type, id });
}

export function updateUserRoles(userId: number, roles: Partial<IUser['roles']>) {
  return superagent
    .post('/api/update-permissions')
    .send({
      userId,
      ...roles,
    });
}
//#endregion
