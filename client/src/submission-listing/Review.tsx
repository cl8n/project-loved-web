import type { ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { dateFromString } from '../date-format';
import type { IReview, IUser } from '../interfaces';
import { UserInline } from '../UserInline';
import { reviewIsNew, reviewScoreClasses } from './helpers';
import ReviewScore from './ReviewScore';

interface ReviewProps {
  review: IReview & { captain: IUser };
}

export default function Review({ review }: ReviewProps) {
  const messageValues = {
    timestamp: dateFromString(review.reviewed_at),
    user: review.active_captain ? (
      <b>
        <UserInline user={review.captain} />{' '}
        <FormattedMessage
          defaultMessage='(captain)'
          description='[Reviews] Suffix on user for review listing'
        />
      </b>
    ) : (
      <>
        <UserInline user={review.captain} />
        {review.active_captain === false && (
          <>
            {' '}
            <FormattedMessage
              defaultMessage='(alumni)'
              description='[Reviews] Suffix on user for review listing'
            />
          </>
        )}
      </>
    ),
  };
  const scoreClass = reviewScoreClasses[review.score < -3 ? 0 : review.score + 3];

  return (
    <li>
      {review.score < -3 ? (
        <FormattedMessage
          defaultMessage='{user} marked as <score>not allowed</score> on {timestamp, date, long}'
          description='[Reviews] Review line for marking the map as not allowed'
          values={{
            ...messageValues,
            score: (c: ReactNode) => <span className={'review ' + scoreClass}>{c}</span>,
          }}
        />
      ) : (
        <FormattedMessage
          defaultMessage='{user} reviewed with {score} on {timestamp, date, long}'
          description='[Reviews] Review line'
          values={{
            ...messageValues,
            score: <ReviewScore review={review} />,
          }}
        />
      )}
      {reviewIsNew(review) && (
        <span className='new'>
          {' ('}
          <FormattedMessage
            defaultMessage='New!'
            description='[Submissions] Indicator for content recently updated'
          />
          )
        </span>
      )}
      <div className={'submission-reason ' + scoreClass}>"{review.reason}"</div>
    </li>
  );
}
