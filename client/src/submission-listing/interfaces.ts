import type { GetSubmissionsResponseBody } from '../api';
import type { IReview, ISubmission } from '../interfaces';

export type SubmittedBeatmapset = GetSubmissionsResponseBody['beatmapsets'][number] & {
  creator: GetSubmissionsResponseBody['usersById'][number];
  reviewsAndSubmissions: (IReview | ISubmission)[];
};
