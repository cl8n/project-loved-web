import type { Review } from '../tables.js';

const captainPriorityMap = new Map([
  [-3, -2],
  [-2, -1.5],
  [2, 1.5],
  [3, 2],
]);

/**
 * Get a sum of the captains' review scores. Add a small bonus to each score if
 * they all have the same sign.
 */
export function beatmapCaptainPriority(
  reviews: (Review & { active_captain: boolean | null })[],
): number {
  reviews = reviews.filter(
    (review) => review.active_captain && review.score >= -3 && review.score <= 3,
  );

  if (reviews.length === 0) {
    return 0;
  }

  // Map scores from the old 1–3 scale to 1–2
  const scores = reviews.map((review) => captainPriorityMap.get(review.score) ?? review.score);
  const sum = scores.reduce((sum, score) => sum + score, 0);

  if (scores.every((score) => score > 0)) {
    return sum + reviews.length * 0.5;
  }

  if (scores.every((score) => score < 0)) {
    return sum - reviews.length * 0.5;
  }

  return sum;
}

const ratingMap = new Map([
  [-3, -6.5],
  [-2, -3.5],
  [-1, -1.5],
  [1, 1.5],
  [2, 3.5],
  [3, 6.5],
]);

/**
 * Get an aggregate rating based on the reviews' scores.
 */
export function beatmapRating(reviews: Review[]): number {
  reviews = reviews.filter(
    (review) => review.score >= -3 && review.score <= 3 && review.score !== 0,
  );

  // TODO this stat is garbage
  return reviews.length === 0
    ? 0
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      reviews.reduce((sum, review) => sum + ratingMap.get(review.score)!, 0) /
        Math.sqrt(reviews.length);
}

/**
 * Check if any reviews are set to "Not allowed".
 */
export function containsNotAllowed(reviews: Review[]): boolean {
  return reviews.some((review) => review.score < -3);
}
