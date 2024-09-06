import type { Review } from 'loved-bridge/tables';
import { useIntl } from 'react-intl';
import { reviewScoreClasses, reviewScoreMessages } from './helpers';

interface ReviewScoreProps {
  review: Pick<Review, 'score'>;
}

export default function ReviewScore({ review }: ReviewScoreProps) {
  const intl = useIntl();

  const scoreClass = reviewScoreClasses[review.score < -3 ? 0 : review.score + 3];

  // TODO "not allowed" isn't translated here because it's only used in logs which also aren't translated
  const scoreText =
    review.score < -3 ? 'not allowed' : intl.formatMessage(reviewScoreMessages[review.score + 3]);

  return <span className={'review ' + scoreClass}>{scoreText}</span>;
}
