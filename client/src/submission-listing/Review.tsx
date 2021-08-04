import { dateFromString } from '../date-format';
import { IReview, IUserWithoutRoles } from '../interfaces';
import { UserInline } from '../UserInline';

const scoreTexts = [
  'strong rejection',
  'rejection',
  'light rejection',
  'no preference',
  'light support',
  'support',
  'strong support',
] as const;
const scoreClasses = scoreTexts.map((score) => score.replace(' ', '-'));

interface ReviewProps {
  review: IReview & { captain: IUserWithoutRoles & { alumni: boolean | null; } };
}

export default function Review({ review }: ReviewProps) {
  const scoreClass = scoreClasses[review.score + 3];
  const scoreText = scoreTexts[review.score + 3];

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
