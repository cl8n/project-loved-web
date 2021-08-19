import { GetSubmissionsResponseBody } from '../api';
import { IReview, ISubmission } from '../interfaces';
import Review from './Review';
import Submission from './submission';

interface Props {
  reviews: IReview[];
  submissions: ISubmission[];
  usersById: GetSubmissionsResponseBody['usersById'];
}

export default function SubmissionsDropdown({ reviews, submissions, usersById }: Props) {
  return (
    <ul>
      {reviews.map((review) => (
        <Review
          key={'r' + review.id}
          review={{
            ...review,
            captain: usersById[review.captain_id],
          }}
        />
      ))}
      {submissions.map((submission) => (
        <Submission
          key={submission.id}
          submission={{
            ...submission,
            submitter: submission.submitter_id == null ? null : usersById[submission.submitter_id],
          }}
        />
      ))}
    </ul>
  );
}
