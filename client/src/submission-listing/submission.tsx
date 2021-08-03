import { dateFromString } from '../date-format';
import { ISubmission, IUserWithoutRoles } from '../interfaces';
import { UserInline } from '../UserInline';

interface Props {
  submission: ISubmission & { submitter: IUserWithoutRoles | null };
}

export default function Submission({ submission }: Props) {
  return (
    <li>
      <div>
        {submission.submitter == null
          ? <i>System</i>
          : <UserInline user={submission.submitter} />
        }
        {' '} submitted this map
        {submission.submitted_at != null && (
          ' on ' + dateFromString(submission.submitted_at).toLocaleString()
        )}
      </div>
      {submission.reason != null && (
        <div className='submission-reason'>"{submission.reason}"</div>
      )}
    </li>
  );
}
