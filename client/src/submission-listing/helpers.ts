import { defineMessages } from 'react-intl';
import { dateFromString } from '../date-format';
import type { IReview, ISubmission } from '../interfaces';

export type ToggleableColumn =
  | 'bpm'
  | 'difficultyCount'
  | 'favoriteCount'
  | 'playCount'
  | 'score'
  | 'year';
export type ToggleableColumnsState = Record<ToggleableColumn, boolean>;
export const toggleableColumns = [
  'score',
  'playCount',
  'favoriteCount',
  'year',
  'difficultyCount',
  'bpm',
] as const;

const messages = defineMessages({
  strongRejection: {
    defaultMessage: 'strong rejection',
    description: '-3 review score. Fits into {score} of the review line',
  },
  rejection: {
    defaultMessage: 'rejection',
    description: '-2 review score. Fits into {score} of the review line',
  },
  lightRejection: {
    defaultMessage: 'light rejection',
    description: '-1 review score. Fits into {score} of the review line',
  },
  noPreference: {
    defaultMessage: 'no preference',
    description: '0 review score. Fits into {score} of the review line',
  },
  lightSupport: {
    defaultMessage: 'light support',
    description: '+1 review score. Fits into {score} of the review line',
  },
  support: {
    defaultMessage: 'support',
    description: '+2 review score. Fits into {score} of the review line',
  },
  strongSupport: {
    defaultMessage: 'strong support',
    description: '+3 review score. Fits into {score} of the review line',
  },
});

const reviewScoreMap = new Map([
  [-3, -6.5],
  [-2, -3.5],
  [-1, -1.5],
  [1, 1.5],
  [2, 3.5],
  [3, 6.5],
]);
export function aggregateReviewScore(reviews: IReview[]): number {
  reviews = reviews.filter(
    (review) => review.score >= -3 && review.score <= 3 && review.score !== 0,
  );

  return reviews.length === 0
    ? 0
    : reviews.reduce((sum, review) => sum + reviewScoreMap.get(review.score)!, 0) /
        Math.sqrt(reviews.length);
}

export function displayRange(values: number[], displayFn?: (value: number) => string) {
  const max = Math.max(...values);
  const min = Math.min(...values);

  if (displayFn == null) {
    displayFn = (value) => value.toString(10);
  }

  return max === min ? displayFn(max) : `${displayFn(min)}–${displayFn(max)}`;
}

export const reviewScoreMessages = [
  messages.strongRejection,
  messages.rejection,
  messages.lightRejection,
  messages.noPreference,
  messages.lightSupport,
  messages.support,
  messages.strongSupport,
] as const;
export const reviewScoreClasses = reviewScoreMessages.map(
  (_, score) => `review-score-${score - 3}`,
);
export const selectableReviewScores = [3, 2, 1, -1, -2, -3];

export function submissionIsNew(submission: ISubmission): boolean {
  const submitDate = dateFromString(submission.submitted_at);
  return submitDate != null && Date.now() <= submitDate.getTime() + 604800000;
}
