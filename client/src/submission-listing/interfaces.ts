import type { GetSubmissionsResponseBody } from '../api';

export type SubmittedBeatmapset = GetSubmissionsResponseBody['beatmapsets'][number] & {
  creator: GetSubmissionsResponseBody['usersById'][number];
};
