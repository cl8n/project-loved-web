import { ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { dateFromString } from '../date-format';
import { IReview, IUserWithoutRoles } from '../interfaces';
import { UserInline } from '../UserInline';
import { reviewScoreClasses, reviewScoreMessages } from './helpers';

interface ReviewProps {
  review: IReview & { captain: IUserWithoutRoles & { alumni: boolean | null; } };
}

export default function Review({ review }: ReviewProps) {
  const intl = useIntl();
  const scoreClass = reviewScoreClasses[review.score < -3 ? 0 : review.score + 3];

  if (review.score < -3) {
    return (
      <li>
        <FormattedMessage
          defaultMessage='{user} marked as <score>not allowed</score> on {timestamp, date, long}'
          description='Review line for marking the map as not allowed'
          values={{
            score: (c: ReactNode) => <span className={'review ' + scoreClass}>{c}</span>,
            timestamp: dateFromString(review.reviewed_at),
            user: <b><UserInline user={review.captain} /></b>,
          }}
        />
        <div className={'submission-reason ' + scoreClass}>"{review.reason}"</div>
      </li>
    );
  }

  return (
    <li>
      <FormattedMessage
        defaultMessage='{user} reviewed with {score} on {timestamp, date, long}'
        description='Review line'
        values={{
          score: <span className={'review ' + scoreClass}>{intl.formatMessage(reviewScoreMessages[review.score + 3])}</span>,
          timestamp: dateFromString(review.reviewed_at),
          user: <b><UserInline user={review.captain} /></b>,
        }}
      />
      <div className={'submission-reason ' + scoreClass}>"{review.reason}"</div>
    </li>
  );
}
