import { FormattedMessage } from 'react-intl';
import { dateFromString } from '../date-format';
import { ISubmission, IUserWithoutRoles } from '../interfaces';
import { UserInline } from '../UserInline';

interface SubmissionProps {
  submission: ISubmission & { submitter: IUserWithoutRoles | null };
}

export default function Submission({ submission }: SubmissionProps) {
  return (
    <li>
      <FormattedMessage
        defaultMessage='
          {hasTimestamp, select,
            true {{user} submitted this map on {timestamp, date, long}}
            other {{user} submitted this map}
          }
        '
        description='Submission line'
        tagName='div'
        values={{
          hasTimestamp: submission.submitted_at != null,
          timestamp: dateFromString(submission.submitted_at),
          user: submission.submitter == null
            ? <i>System</i>
            : <UserInline user={submission.submitter} />,
        }}
      />
      {submission.reason != null && (
        <div className='submission-reason'>"{submission.reason}"</div>
      )}
    </li>
  );
}
