import { GetSubmissionsResponseBody } from '../api';
import { ISubmission } from '../interfaces';
import Submission from './submission';

interface Props {
  submissions: ISubmission[];
  usersById: GetSubmissionsResponseBody['usersById'];
}

export default function SubmissionsDropdown({ submissions, usersById }: Props) {
  return (
    <ul className='submissions'>
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
