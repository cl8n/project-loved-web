import type { Review } from '../tables.js';

const reviewRatingScale = new Map([
  [-3, -6.5],
  [-2, -3.5],
  [-1, -1.5],
  [1, 1.5],
  [2, 3.5],
  [3, 6.5],
]);

export function reviewRating(
  reviews: (Review & { active_captain: boolean | null })[],
  includeNonCaptain?: boolean,
): number {
  reviews = reviews.filter(
    (review) =>
      (includeNonCaptain || review.active_captain) &&
      review.score >= -3 &&
      review.score <= 3 &&
      review.score !== 0,
  );

  return reviews.length === 0
    ? 0
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      reviews.reduce((sum, review) => sum + reviewRatingScale.get(review.score)!, 0) /
        Math.sqrt(reviews.length);
}
