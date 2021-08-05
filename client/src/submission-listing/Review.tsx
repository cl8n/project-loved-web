import { dateFromString } from '../date-format';
import { IReview, IUserWithoutRoles } from '../interfaces';
import { UserInline } from '../UserInline';
import { reviewScoreClasses, reviewScoreTexts } from './helpers';

interface ReviewProps {
  review: IReview & { captain: IUserWithoutRoles & { alumni: boolean | null; } };
}

export default function Review({ review }: ReviewProps) {
  const scoreClass = reviewScoreClasses[review.score + 3];
  const scoreText = reviewScoreTexts[review.score + 3];

  return (
    <li>
      <div>
        <b><UserInline user={review.captain} /></b>
        {' reviewed with '}
        <span className={'review ' + scoreClass}>{scoreText}</span>
        {' on ' + dateFromString(review.reviewed_at).toLocaleString()}
      </div>
      <div className={'submission-reason ' + scoreClass}>"{review.reason}"</div>
    </li>
  );
}
