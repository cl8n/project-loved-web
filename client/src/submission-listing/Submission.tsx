import { FormattedMessage } from 'react-intl';
import { dateFromString } from '../date-format';
import type { ISubmission, IUser } from '../interfaces';
import { UserInline } from '../UserInline';
import { reviewIsNew } from './helpers';

interface SubmissionProps {
  submission: ISubmission & { submitter: IUser | null };
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
        description='[Submissions] Submission line'
        values={{
          hasTimestamp: submission.submitted_at != null,
          timestamp: dateFromString(submission.submitted_at),
          user:
            submission.submitter == null ? (
              <i>System</i>
            ) : (
              <UserInline user={submission.submitter} />
            ),
        }}
      />
      {reviewIsNew(submission) && (
        <span className='new'>
          {' ('}
          <FormattedMessage
            defaultMessage='New!'
            description='[Submissions] Indicator for content recently updated'
          />
          )
        </span>
      )}
      {submission.reason != null && <div className='submission-reason'>"{submission.reason}"</div>}
    </li>
  );
}
