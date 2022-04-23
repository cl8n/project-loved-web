import type { GetSubmissionsResponseBody } from '../api';
import type { IReview, ISubmission } from '../interfaces';
import type { SubmittedBeatmapset } from './interfaces';
import Review from './Review';
import Submission from './Submission';

function isReview(reviewOrSubmission: IReview | ISubmission): reviewOrSubmission is IReview {
  return (reviewOrSubmission as any).score != null;
}

interface SubmissionsListProps {
  reviewsAndSubmissions: SubmittedBeatmapset['reviewsAndSubmissions'];
  usersById: GetSubmissionsResponseBody['usersById'];
}

export default function SubmissionsList({
  reviewsAndSubmissions,
  usersById,
}: SubmissionsListProps) {
  return (
    <ul className='submissions'>
      {reviewsAndSubmissions.map((rOrS) =>
        isReview(rOrS) ? (
          <Review
            key={'r' + rOrS.id}
            review={{
              ...rOrS,
              captain: usersById[rOrS.reviewer_id],
            }}
          />
        ) : (
          <Submission
            key={rOrS.id}
            submission={{
              ...rOrS,
              submitter: rOrS.submitter_id == null ? null : usersById[rOrS.submitter_id],
            }}
          />
        ),
      )}
    </ul>
  );
}
