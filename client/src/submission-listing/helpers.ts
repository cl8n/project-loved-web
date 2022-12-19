import type { IntlShape } from 'react-intl';
import { defineMessages } from 'react-intl';
import { dateFromString } from '../date-format';
import type { IReview, ISubmission } from '../interfaces';
import type { SubmittedBeatmapset } from './interfaces';

export type ToggleableColumn =
  | 'bpm'
  | 'difficultyCount'
  | 'favoriteCount'
  | 'keyModes'
  | 'playCount'
  | 'rating'
  | 'score'
  | 'year';
export type ToggleableColumnsState = Record<ToggleableColumn, boolean>;
export const toggleableColumns = [
  'keyModes',
  'rating',
  'score',
  'playCount',
  'favoriteCount',
  'year',
  'difficultyCount',
  'bpm',
] as const;

const messages = defineMessages({
  veryNegative: {
    defaultMessage: 'strong opposition',
    description: '[Reviews] Very negative review score. Fits into {score} of the review line',
  },
  negative: {
    defaultMessage: 'opposition',
    description: '[Reviews] Negative review score. Fits into {score} of the review line',
  },
  noPreference: {
    defaultMessage: 'no preference',
    description: '[Reviews] Neutral review score. Fits into {score} of the review line',
  },
  positive: {
    defaultMessage: 'support',
    description: '[Reviews] Positive review score. Fits into {score} of the review line',
  },
  veryPositive: {
    defaultMessage: 'strong support',
    description: '[Reviews] Very positive review score. Fits into {score} of the review line',
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
export function aggregateReviewScore(reviews: IReview[], includeNonCaptain?: boolean): number {
  reviews = reviews.filter(
    (review) =>
      (includeNonCaptain || review.active_captain) &&
      review.score >= -3 &&
      review.score <= 3 &&
      review.score !== 0,
  );

  return reviews.length === 0
    ? 0
    : reviews.reduce((sum, review) => sum + reviewScoreMap.get(review.score)!, 0) /
        Math.sqrt(reviews.length);
}

export function beatmapsetNotAllowed(beatmapset: SubmittedBeatmapset): boolean {
  return (
    beatmapset.strictly_rejected ||
    beatmapset.consent === false ||
    beatmapset.creator.banned ||
    beatmapset.maximum_length < 30 ||
    beatmapset.low_favorites
  );
}

export function combineReviewsAndSubmissions(
  reviews: IReview[],
  submissions: ISubmission[],
): (IReview | ISubmission)[] {
  const reviewsAndSubmissions: (IReview | ISubmission)[] = [];
  let reviewIndex = 0;
  let submissionIndex = 0;

  while (reviewIndex < reviews.length || submissionIndex < submissions.length) {
    if (reviewIndex >= reviews.length) {
      reviewsAndSubmissions.push(submissions[submissionIndex]);
      submissionIndex++;
      continue;
    }

    if (submissionIndex >= submissions.length) {
      reviewsAndSubmissions.push(reviews[reviewIndex]);
      reviewIndex++;
      continue;
    }

    if (
      reviews[reviewIndex].active_captain != null ||
      submissions[submissionIndex].submitted_at == null ||
      dateFromString(reviews[reviewIndex].reviewed_at).getTime() <=
        dateFromString(submissions[submissionIndex].submitted_at as string).getTime()
    ) {
      reviewsAndSubmissions.push(reviews[reviewIndex]);
      reviewIndex++;
    } else {
      reviewsAndSubmissions.push(submissions[submissionIndex]);
      submissionIndex++;
    }
  }

  return reviewsAndSubmissions;
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
  messages.veryNegative,
  messages.negative,
  messages.negative,
  messages.noPreference,
  messages.positive,
  messages.positive,
  messages.veryPositive,
] as const;
export const reviewScoreClasses = reviewScoreMessages.map(
  (_, score) => `review-score-${score - 3}`,
);
const reviewScoreSymbols = ['-2', '-1.5', '-1', '0', '+1', '+1.5', '+2'] as const;

export function reviewScoreTitle(intl: IntlShape, score: number): string {
  const message = intl.formatMessage(reviewScoreMessages[score + 3]);
  return `${message.charAt(0).toUpperCase()}${message.slice(1)} (${reviewScoreSymbols[score + 3]})`;
}

export function reviewIsNew(review: IReview | ISubmission): boolean {
  const submitDate = dateFromString(
    (review as IReview).reviewed_at ?? (review as ISubmission).submitted_at,
  );
  return submitDate != null && Date.now() <= submitDate.getTime() + 604800000;
}
